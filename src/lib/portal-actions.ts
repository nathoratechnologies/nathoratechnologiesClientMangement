"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as db from "./db";
import * as portal from "./portal";
import { requireUser, canAccessBug, ownsProject, type CurrentUser } from "./auth";
import { notifyAdmin } from "./whatsapp";
import {
  BUG_STATUSES,
  BUG_STATUS_LABEL,
  CURRENCIES,
  PRIORITIES,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  UPDATE_KINDS,
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

export async function adminUpdateClient(id: string, f: FormData) {
  await requireUser(["ADMIN"]);
  const name = str(f, "name");
  if (name.length < 2) return;
  await db.updateUser(id, { name, company: str(f, "company") || null, phone: str(f, "phone") || null });
  refresh();
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

/**
 * Admin: start on any project (optionally a bug).
 * Staff: start only on a bug assigned to them.
 */
export async function startTimer(f: FormData) {
  const me = await requireUser(["ADMIN", "STAFF"]);
  const bugId = str(f, "bugId") || null;
  const bug = bugId ? await portal.getBug(bugId) : null;
  if (bugId && (!bug || !canAccessBug(me, bug))) return;
  if (me.role === "STAFF" && !bug) return;
  const project = await portal.getProject(bug ? bug.projectId : str(f, "projectId"));
  if (!project) return;

  await portal.startTimer(me, project, bug, str(f, "note").slice(0, 300));
  if (bug && (bug.status === "REPORTED" || bug.status === "ASSIGNED")) {
    await portal.updateBug(bug.id, { status: "DEVELOPING" });
    await portal.addBugNote(bug.id, { system: true, body: `${me.name} started working · Status: ${BUG_STATUS_LABEL.DEVELOPING}` });
  } else if (bug) {
    await portal.addBugNote(bug.id, { system: true, body: `${me.name} started working` });
  }
  refresh();
}

export async function stopTimer(entryId: string) {
  const me = await requireUser(["ADMIN", "STAFF"]);
  const e = await portal.getEntry(entryId);
  if (!e || (me.role !== "ADMIN" && e.userId !== me.id)) return;
  const done = await portal.stopTimer(entryId);
  if (done?.bugId) {
    const mins = Math.round(portal.entryMs(done) / 60000);
    await portal.addBugNote(done.bugId, { system: true, body: `${done.userName} stopped working (${Math.floor(mins / 60)}h ${mins % 60}m logged)` });
  }
  refresh();
}

export async function addManualTime(projectId: string, _: FormState, f: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);
  const project = await portal.getProject(projectId);
  if (!project) return { error: "Project not found" };
  const hours = Number(str(f, "hours") || 0);
  const minutes = Number(str(f, "minutes") || 0);
  const ms = Math.round((hours * 60 + minutes) * 60_000);
  if (!Number.isFinite(ms) || ms <= 0 || ms > 24 * 3_600_000) return { error: "Enter a time between 1 minute and 24 hours" };
  const person = await db.getUserById(str(f, "userId"));
  if (!person || person.role === "USER") return { error: "Choose who did the work" };
  const bugId = str(f, "bugId") || null;
  const bug = bugId ? await portal.getBug(bugId) : null;
  if (bug && bug.projectId !== projectId) return { error: "That bug belongs to another project" };

  const dateStr = str(f, "date");
  const end = dateStr ? new Date(`${dateStr}T18:00:00+05:30`) : new Date();
  if (Number.isNaN(end.getTime())) return { error: "Pick a valid date" };
  await portal.addManualEntry({
    projectId,
    projectName: project.name,
    clientId: project.clientId,
    bugId: bug?.id ?? null,
    bugTitle: bug?.title ?? null,
    userId: person.id,
    userName: person.name,
    note: str(f, "note").slice(0, 300),
    startedAt: new Date(end.getTime() - ms),
    endedAt: end,
  });
  refresh();
  return { ok: true, message: `Added ${hours || 0}h ${minutes || 0}m for ${person.name}` };
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
