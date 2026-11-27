"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as db from "./db";
import * as portal from "./portal";
import { requireUser, canAccessBug, ownsProject, type CurrentUser } from "./auth";
import { notifyAdmin, sendText, whatsAppConfigured } from "./whatsapp";
import { buildDayBill, dayOf } from "./bill";
import {
  BUG_STATUSES,
  BUG_STATUS_LABEL,
  CURRENCIES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  UPDATE_KINDS,
  fmtMoney,
} from "./portal-config";
import type { FormState } from "./actions";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const refresh = () => revalidatePath("/dashboard", "layout");

/* ---------- Clients (admin) ---------- */

const clientSchema = z.object({
  name: z.string().min(2, "Enter the client's name"),
  company: z.string().optional(),
  username: z
    .string()
    .min(3, "Username needs at least 3 characters")
    .max(32, "Username is too long")
    .regex(/^[a-z0-9._-]+$/, "Username: use only letters, numbers, dot, dash or underscore"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email or leave it blank")]),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function adminCreateClient(_: FormState, f: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);
  const parsed = clientSchema.safeParse({
    name: str(f, "name"),
    company: str(f, "company") || undefined,
    username: str(f, "username").toLowerCase(),
    email: str(f, "email").toLowerCase(),
    phone: str(f, "phone") || undefined,
    password: str(f, "password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, company, username, email, phone, password } = parsed.data;
  const created = await db.createUser({
    name,
    company: company ?? null,
    username,
    // Email is optional for clients; a placeholder keeps the account unique.
    email: email || `${username}@client.nathora.local`,
    phone: phone ?? null,
    password: await bcrypt.hash(password, 10),
    role: "USER",
  });
  if (!created) return { error: "That username or email is already in use" };
  refresh();
  return { ok: true, message: `Client ${name} created. Login: ${username} / ${password}` };
}


export async function adminResetPassword(id: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser(["ADMIN"]);
  const password = str(f, "password");
  if (password.length < 6) return { error: "Password must be at least 6 characters" };
  if (id === me.id) return { error: "Change your own password in Profile" };
  await db.updateUser(id, { password: await bcrypt.hash(password, 10) });
  return { ok: true, message: `New password set: ${password}` };
}

/* ---------- Projects ---------- */

const projectSchema = z.object({
  name: z.string().min(2, "Enter a project name"),
  description: z.string().default(""),
  status: z.enum(PROJECT_STATUSES),
  hourlyRate: z.coerce.number().min(0, "Rate can't be negative").max(1_000_000),
  currency: z.enum(CURRENCIES),
  liveUrl: z.union([z.literal(""), z.string().url("Enter a full URL, e.g. https://…")]),
});

const readProject = (f: FormData) =>
  projectSchema.safeParse({
    name: str(f, "name"),
    description: str(f, "description"),
    status: str(f, "status") || "PLANNING",
    hourlyRate: str(f, "hourlyRate") || "0",
    currency: str(f, "currency") || "INR",
    liveUrl: str(f, "liveUrl"),
  });

export async function createProject(clientId: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser(["ADMIN"]);
  const client = await db.getUserById(clientId);
  if (!client || client.role !== "USER") return { error: "Client not found" };
  const parsed = readProject(f);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = await portal.createProject({ ...parsed.data, liveUrl: parsed.data.liveUrl || null, clientId, clientName: client.company || client.name });
  await portal.addUpdate(p.id, { kind: "NOTE", title: "Project created", body: `Status: ${PROJECT_STATUS_LABEL[p.status]}`, authorName: me.name });
  refresh();
  redirect(`/dashboard/projects/${p.id}`);
}

export async function updateProject(id: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser(["ADMIN"]);
  const p = await portal.getProject(id);
  if (!p) return { error: "Project not found" };
  const parsed = readProject(f);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await portal.updateProject(id, { ...parsed.data, liveUrl: parsed.data.liveUrl || null });
  if (parsed.data.status !== p.status) {
    await portal.addUpdate(id, {
      kind: parsed.data.status === "LIVE" ? "DEPLOYMENT" : "NOTE",
      title: `Status: ${PROJECT_STATUS_LABEL[parsed.data.status]}`,
      body: "",
      authorName: me.name,
    });
  }
  refresh();
  return { ok: true, message: "Project saved" };
}

export async function deleteProject(id: string) {
  await requireUser(["ADMIN"]);
  const p = await portal.getProject(id);
  await portal.deleteProject(id);
  refresh();
  redirect(p ? `/dashboard/clients/${p.clientId}` : "/dashboard/projects");
}

/** Staff can post updates on projects where they have an assigned bug. */
async function canWorkOnProject(user: CurrentUser, projectId: string) {
  if (user.role === "ADMIN") return true;
  if (user.role !== "STAFF") return false;
  return (await portal.listBugs({ assignedToId: user.id })).some((b) => b.projectId === projectId);
}

export async function postUpdate(projectId: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser(["ADMIN", "STAFF"]);
  if (!(await canWorkOnProject(me, projectId))) return { error: "Not allowed" };
  const title = str(f, "title");
  const kind = str(f, "kind");
  if (title.length < 3) return { error: "Write a short title for the update" };
  await portal.addUpdate(projectId, {
    kind: (UPDATE_KINDS as readonly string[]).includes(kind) ? kind : "NOTE",
    title: title.slice(0, 200),
    body: str(f, "body").slice(0, 4000),
    authorName: me.name,
  });
  refresh();
  return { ok: true, message: "Update posted. The client can see it now." };
}

export async function deleteUpdate(projectId: string, updateId: string) {
  await requireUser(["ADMIN"]);
  await portal.deleteUpdate(projectId, updateId);
  refresh();
}

/* ---------- Bugs ---------- */

const bugSchema = z.object({
  title: z.string().min(4, "Give the bug a short title"),
  description: z.string().min(10, "Describe what went wrong (10+ characters)"),
  priority: z.enum(PRIORITIES),
});

export async function reportBug(projectId: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser(["USER", "ADMIN"]);
  const p = await portal.getProject(projectId);
  if (!p || !ownsProject(me, p)) return { error: "Project not found" };
  const parsed = bugSchema.safeParse({ title: str(f, "title"), description: str(f, "description"), priority: str(f, "priority") || "MEDIUM" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const bug = await portal.createBug({
    ...parsed.data,
    title: parsed.data.title.slice(0, 200),
    description: parsed.data.description.slice(0, 6000),
    projectId: p.id,
    projectName: p.name,
    clientId: p.clientId,
    reportedById: me.id,
    reportedByName: me.name,
  });
  await portal.addBugNote(bug.id, { system: true, body: `Bug reported by ${me.name}` });
  if (me.role === "USER") {
    await notifyAdmin(`New bug on ${p.name} (${p.clientName})\n[${bug.priority}] ${bug.title}\n\n${bug.description.slice(0, 500)}`);
  }
  refresh();
  redirect(`/dashboard/bugs/${bug.id}`);
}

export async function updateBug(id: string, f: FormData) {
  const me = await requireUser(["ADMIN", "STAFF"]);
  const b = await portal.getBug(id);
  if (!b || !canAccessBug(me, b)) return;

  const data: Partial<Pick<portal.Bug, "status" | "priority" | "assignedToId" | "assignedToName">> = {};
  const notes: string[] = [];

  if (me.role === "ADMIN" && f.has("assignedToId")) {
    const a = str(f, "assignedToId") || null;
    if (a !== b.assignedToId) {
      const staff = a ? await db.getUserById(a) : null;
      data.assignedToId = staff && staff.role !== "USER" ? staff.id : null;
      data.assignedToName = staff && staff.role !== "USER" ? staff.name : null;
      notes.push(data.assignedToName ? `Assigned to ${data.assignedToName}` : "Unassigned");
    }
  }
  if (me.role === "ADMIN") {
    const priority = str(f, "priority");
    if ((PRIORITIES as readonly string[]).includes(priority) && priority !== b.priority) {
      data.priority = priority;
      notes.push(`Priority set to ${priority.toLowerCase()}`);
    }
  }
  let status = str(f, "status") || b.status;
  // Assigning someone while the bug is still "Reported" moves it to "Assigned".
  if (status === "REPORTED" && data.assignedToId) status = "ASSIGNED";
  if ((BUG_STATUSES as readonly string[]).includes(status) && status !== b.status) {
    data.status = status;
    notes.push(`Status: ${BUG_STATUS_LABEL[status]}`);
  }
  if (!Object.keys(data).length) return;

  await portal.updateBug(id, data);
  await portal.addBugNote(id, { system: true, body: `${notes.join(" · ")} by ${me.name}` });
  if (data.status === "FIXED") {
    await portal.addUpdate(b.projectId, { kind: "FIX", title: `Fixed: ${b.title}`, body: "", authorName: me.name });
  }
  refresh();
}

export async function addBugComment(id: string, f: FormData) {
  const me = await requireUser();
  const b = await portal.getBug(id);
  const body = str(f, "body");
  if (!b || !body || !canAccessBug(me, b)) return;
  await portal.addBugNote(id, { body: body.slice(0, 4000), authorName: me.name, authorRole: me.role });
  refresh();
}

export async function deleteBug(id: string) {
  await requireUser(["ADMIN"]);
  const b = await portal.getBug(id);
  await portal.deleteBug(id);
  refresh();
  redirect(b ? `/dashboard/projects/${b.projectId}` : "/dashboard/bugs");
}

/* ---------- Time tracking ---------- */

const IST = "+05:30";
const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const clock = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
/** "2026-11-24" + "07:30" in India time. */
const atIST = (date: string, time: string) => new Date(`${date}T${time}:00${IST}`);

/**
 * Who may log time where:
 * admin anywhere; staff on projects they work on, and on a bug only if it is assigned to them.
 */
async function timeTarget(me: CurrentUser, projectId: string, bugId: string | null) {
  const bug = bugId ? await portal.getBug(bugId) : null;
  if (bugId && !bug) return { error: "That bug no longer exists" } as const;
  if (bug && me.role === "STAFF" && bug.assignedToId !== me.id) return { error: "This bug is assigned to someone else" } as const;
  const project = await portal.getProject(bug ? bug.projectId : projectId);
  if (!project) return { error: "Project not found" } as const;
  if (!(await portal.canViewProject(me, project))) return { error: "You don't have access to this project" } as const;
  return { project, bug } as const;
}

/** Start the current user's timer. Optional `startAt` (HH:MM, today) back-dates it for "I forgot to press start". */
export async function startTimer(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  if (me.role === "USER") return { error: "Only the Nathora team can track time" };
  const t = await timeTarget(me, str(f, "projectId"), str(f, "bugId") || null);
  if ("error" in t) return { error: t.error };

  let startedAt: Date | undefined;
  const startAt = str(f, "startAt");
  if (startAt) {
    startedAt = atIST(todayIST(), startAt);
    const now = Date.now();
    if (Number.isNaN(startedAt.getTime())) return { error: "Enter a valid start time" };
    if (startedAt.getTime() > now + 60_000) return { error: `${startAt} is later than now. Pick a time that has already passed today.` };
    const mine = await portal.listEntries({ userId: me.id });
    const running = mine.find((e) => !e.endedAt);
    if (running && running.startedAt > startedAt) {
      return { error: `Your timer on "${running.bugTitle ?? running.projectName}" has been running since ${clock(running.startedAt)}. Stop it first, or pick a start time after that.` };
    }
    // Never let a back-dated timer cover time that is already logged (it would be billed twice).
    const clash = mine.filter((e) => e.endedAt && e.endedAt > startedAt!).sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())[0];
    if (clash) {
      return { error: `You already logged ${clock(clash.startedAt)}–${clock(clash.endedAt!)} on "${clash.bugTitle ?? clash.projectName}". Pick a start time after ${clock(clash.endedAt!)}.` };
    }
  }

  await portal.startTimer(me, t.project, t.bug, str(f, "note").slice(0, 300), startedAt);
  const since = startedAt ? ` (from ${clock(startedAt)})` : "";
  if (t.bug && (t.bug.status === "REPORTED" || t.bug.status === "ASSIGNED")) {
    await portal.updateBug(t.bug.id, { status: "DEVELOPING" });
    await portal.addBugNote(t.bug.id, { system: true, body: `${me.name} started working${since} · Status: ${BUG_STATUS_LABEL.DEVELOPING}` });
  } else if (t.bug) {
    await portal.addBugNote(t.bug.id, { system: true, body: `${me.name} started working${since}` });
  }
  refresh();
  return { ok: true, message: "Timer started" };
}

/**
 * Stop a timer. When the admin ticks "Prepare WhatsApp bill", they land on the
 * project's billing tab with that day's bill ready to send to the client.
 */
export async function stopTimer(entryId: string, f?: FormData) {
  const me = await requireUser(["ADMIN", "STAFF"]);
  const e = await portal.getEntry(entryId);
  if (!e || (me.role !== "ADMIN" && e.userId !== me.id)) return;
  const done = await portal.stopTimer(entryId);
  if (done?.bugId) {
    const mins = Math.round(portal.entryMs(done) / 60000);
    await portal.addBugNote(done.bugId, { system: true, body: `${done.userName} stopped working (${Math.floor(mins / 60)}h ${mins % 60}m logged)` });
  }
  refresh();
  if (done && me.role === "ADMIN" && f?.get("bill") === "1") {
    redirect(`/dashboard/projects/${done.projectId}?tab=billing&day=${dayOf(done.startedAt)}#bill`);
  }
}

/** Send a day's bill to the client through the WhatsApp Cloud API. */
export async function sendDayBill(projectId: string, day: string, _: FormState): Promise<FormState> {
  const me = await requireUser(["ADMIN"]);
  const project = await portal.getProject(projectId);
  if (!project) return { error: "Project not found" };
  if (!whatsAppConfigured()) return { error: "WhatsApp API keys are not set up yet. Use “Open in WhatsApp” instead." };
  const bill = await buildDayBill(project, day);
  if (!bill.phone) return { error: "This client has no WhatsApp number saved. Add it under Clients › details." };
  if (!bill.sessions.length) return { error: "No finished work on this day to bill." };
  const log = await sendText(bill.phone, bill.text, "BILL");
  if (log.status !== "SENT") return { error: `WhatsApp did not accept the message: ${log.detail ?? log.status}` };
  await portal.addUpdate(projectId, { kind: "NOTE", title: `Work report sent on WhatsApp (${day})`, body: "", authorName: me.name });
  refresh();
  return { ok: true, message: `Bill sent to ${bill.clientName} on WhatsApp` };
}

/**
 * Log time after the fact: a date plus From and To times (India time), e.g. 07:30 → 10:15.
 * A To time earlier than From means the work ran past midnight.
 */
export async function addManualTime(projectId: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser();
  if (me.role === "USER") return { error: "Only the Nathora team can log time" };
  const t = await timeTarget(me, projectId, str(f, "bugId") || null);
  if ("error" in t) return { error: t.error };
  if (t.bug && t.bug.projectId !== projectId) return { error: "That bug belongs to another project" };

  // Staff always log their own time; admin can log it for anyone on the team.
  const person = me.role === "ADMIN" && str(f, "userId") ? await db.getUserById(str(f, "userId")) : await db.getUserById(me.id);
  if (!person || person.role === "USER") return { error: "Choose who did the work" };

  const date = str(f, "date") || todayIST();
  const from = str(f, "from");
  const to = str(f, "to");
  if (!from || !to) return { error: "Enter both the From and To times" };
  const start = atIST(date, from);
  let end = atIST(date, to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: "Enter valid times" };
  if (end <= start) end = new Date(end.getTime() + 86_400_000); // past midnight
  const ms = end.getTime() - start.getTime();
  if (ms < 60_000) return { error: "The time must be at least 1 minute" };
  if (ms > 16 * 3_600_000) return { error: "That is more than 16 hours. Split it into separate entries." };
  if (end.getTime() > Date.now() + 60_000) return { error: "The end time is in the future. To log work you are doing now, use Start timer with a start time instead." };

  // Refuse overlaps so the same hours are never billed twice.
  const clash = (await portal.listEntries({ userId: person.id })).find((e) => {
    const eEnd = e.endedAt ? e.endedAt.getTime() : Date.now();
    return e.startedAt.getTime() < end.getTime() && eEnd > start.getTime();
  });
  if (clash) {
    return {
      error: `${person.id === me.id ? "You" : person.name} already have time logged ${clock(clash.startedAt)}–${clash.endedAt ? clock(clash.endedAt) : "now"} on "${clash.bugTitle ?? clash.projectName}". Change the times so they don't overlap.`,
    };
  }

  await portal.addManualEntry({
    projectId,
    projectName: t.project.name,
    clientId: t.project.clientId,
    bugId: t.bug?.id ?? null,
    bugTitle: t.bug?.title ?? null,
    userId: person.id,
    userName: person.name,
    note: str(f, "note").slice(0, 300),
    startedAt: start,
    endedAt: end,
  });
  if (t.bug) await portal.addBugNote(t.bug.id, { system: true, body: `${person.name}: ${clock(start)}–${clock(end)} added manually` });
  refresh();
  const mins = Math.round(ms / 60000);
  return { ok: true, message: `Added ${Math.floor(mins / 60)}h ${mins % 60}m for ${person.name} (${clock(start)}–${clock(end)})` };
}

export async function deleteTimeEntry(entryId: string) {
  await requireUser(["ADMIN"]);
  await portal.deleteEntry(entryId);
  refresh();
}

/* ---------- Documents ---------- */

export async function deleteFile(fileId: string) {
  const me = await requireUser();
  const f = await portal.getFile(fileId);
  if (!f || (me.role !== "ADMIN" && f.uploadedById !== me.id)) return;
  await portal.deleteFile(fileId);
  refresh();
}

/* ---------- Payments (admin records, client sees) ---------- */

/**
 * Record money received from a client. The project comes from the bound id,
 * or from a "projectId" field when the form lets the admin pick one.
 */
export async function addPayment(boundProjectId: string | null, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser(["ADMIN"]);
  const project = await portal.getProject(boundProjectId ?? str(f, "projectId"));
  if (!project) return { error: "Choose the project this payment is for" };

  const raw = str(f, "amount").replace(/[,\s₹$]/g, "");
  const amount = Math.round(Number(raw) * 100) / 100;
  if (!raw || !Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) return { error: "Enter the amount received, e.g. 14400" };

  const date = str(f, "paidOn") || todayIST();
  const paidOn = new Date(`${date}T12:00:00${IST}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(paidOn.getTime())) return { error: "Enter a valid date" };
  if (paidOn.getTime() > Date.now() + 86_400_000) return { error: "The payment date is in the future" };

  const method = (PAYMENT_METHODS as readonly string[]).includes(str(f, "method")) ? str(f, "method") : "OTHER";
  const note = str(f, "note").slice(0, 300);
  await portal.addPayment({
    projectId: project.id,
    projectName: project.name,
    clientId: project.clientId,
    amount,
    currency: project.currency,
    paidOn,
    method,
    reference: str(f, "reference").slice(0, 120),
    note,
    recordedByName: me.name,
  });
  const money = fmtMoney(amount, project.currency);
  await portal.addUpdate(project.id, {
    kind: "NOTE",
    title: `Payment received: ${money}`,
    body: [`${PAYMENT_METHOD_LABEL[method]} · ${date}`, note].filter(Boolean).join("\n"),
    authorName: me.name,
  });
  refresh();
  return { ok: true, message: `${money} recorded for ${project.name}. ${project.clientName} can see it now.` };
}

export async function deletePayment(paymentId: string) {
  await requireUser(["ADMIN"]);
  await portal.deletePayment(paymentId);
  refresh();
}

/* ---------- Edit any user's details (admin) ---------- */

const detailsSchema = z.object({
  name: z.string().min(2, "Enter the name"),
  email: z.union([z.literal(""), z.string().email("Enter a valid email, or leave it blank")]),
  username: z.union([
    z.literal(""),
    z
      .string()
      .min(3, "Username needs at least 3 characters")
      .max(32, "Username is too long")
      .regex(/^[a-z0-9._-]+$/, "Username: use only letters, numbers, dot, dash or underscore"),
  ]),
  phone: z.string().max(30),
  company: z.string().max(120),
  address: z.string().max(500),
  notes: z.string().max(4000),
});

export async function adminEditUser(id: string, _: FormState, f: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);
  const user = await db.getUserById(id);
  if (!user) return { error: "User not found" };
  const parsed = detailsSchema.safeParse({
    name: str(f, "name"),
    email: str(f, "email").toLowerCase(),
    username: str(f, "username").toLowerCase(),
    phone: str(f, "phone"),
    company: str(f, "company"),
    address: str(f, "address"),
    notes: str(f, "notes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  if (!d.email && !d.username) return { error: "Give either an email or a username, so they can sign in" };

  const error = await db.updateUserDetails(id, {
    name: d.name,
    // No email: keep (or create) the unique placeholder so the account stays valid.
    email: d.email || (db.isPlaceholderEmail(user.email) ? user.email : `${d.username}@client.nathora.local`),
    username: d.username || null,
    phone: d.phone || null,
    company: d.company || null,
    address: d.address || null,
    notes: d.notes || null,
  });
  if (error) return { error };
  if (user.role === "USER") await portal.renameClientProjects(id, d.company || d.name);
  refresh();
  return { ok: true, message: "Details saved" };
}

/** Quick rate change from the billing tab. */
export async function updateRate(projectId: string, _: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser(["ADMIN"]);
  const p = await portal.getProject(projectId);
  if (!p) return { error: "Project not found" };
  const raw = str(f, "hourlyRate").replace(/[,\s₹$]/g, "");
  const rate = Number(raw);
  if (!raw || !Number.isFinite(rate) || rate < 0 || rate > 1_000_000) return { error: "Enter the rate as a number, e.g. 500" };
  const currency = (CURRENCIES as readonly string[]).includes(str(f, "currency")) ? str(f, "currency") : p.currency;
  await portal.updateProject(projectId, { hourlyRate: Math.round(rate * 100) / 100, currency });
  if (rate !== p.hourlyRate) {
    await portal.addUpdate(projectId, { kind: "NOTE", title: `Hourly rate set to ${currency} ${rate}`, body: "", authorName: me.name });
  }
  refresh();
  return { ok: true, message: "Rate saved. All amounts are updated." };
}
