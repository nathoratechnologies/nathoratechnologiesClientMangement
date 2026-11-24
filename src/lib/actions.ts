"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as db from "./db";
import { createSession, destroySession, getUser, requireUser, canAccessEnquiry } from "./auth";
import { notifyNewEnquiry, sendManual } from "./whatsapp";
import { STATUSES } from "./site";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

/* ---------- Auth ---------- */

const registerSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function register(_: FormState, f: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: str(f, "name"),
    email: str(f, "email").toLowerCase(),
    phone: str(f, "phone"),
    password: str(f, "password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, phone, password } = parsed.data;
  const user = await db.createUser({ name, email, phone, password: await bcrypt.hash(password, 10) });
  if (!user) return { error: "An account with this email already exists" };
  await db.linkGuestEnquiries(email, user.id);
  await createSession(user);
  redirect("/dashboard");
}

/** First sign-in on a fresh database creates the admin from ADMIN_EMAIL / ADMIN_PASSWORD. */
async function bootstrapAdmin(email: string, password: string) {
  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || "";
  if (!adminEmail || !adminPassword || email !== adminEmail || password !== adminPassword) return null;
  if (await db.hasAdmin()) return null;
  return db.createUser({ name: "Admin", email, password: await bcrypt.hash(password, 10), role: "ADMIN" });
}

export async function login(_: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const password = str(f, "password");
  let user = await db.getUserByLogin(email);
  if (!user && email.includes("@")) user = await bootstrapAdmin(email, password);
  if (!user || !(await bcrypt.compare(password, user.password))) return { error: "Wrong username / email or password" };
  if (!user.active) return { error: "This account is disabled. Contact the admin." };
  await createSession(user);
  const next = str(f, "next");
  redirect(next.startsWith("/dashboard") ? next : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/* ---------- Enquiries ---------- */

const enquirySchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(8, "Enter a valid phone / WhatsApp number"),
  service: z.string().min(2, "Choose a service"),
  budget: z.string().optional(),
  preferred: z.enum(["WHATSAPP", "CALL", "CHAT", "EMAIL"]).default("WHATSAPP"),
  message: z.string().min(10, "Tell us a little more (10+ characters)"),
});

export async function createEnquiry(_: FormState, f: FormData): Promise<FormState> {
  const user = await getUser();
  const parsed = enquirySchema.safeParse({
    name: str(f, "name") || user?.name,
    email: (str(f, "email") || user?.email || "").toLowerCase(),
    phone: str(f, "phone") || user?.phone || "",
    service: str(f, "service"),
    budget: str(f, "budget") || undefined,
    preferred: str(f, "preferred") || "WHATSAPP",
    message: str(f, "message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let userId = user?.id ?? null;
  if (!userId) userId = (await db.getUserByEmail(parsed.data.email))?.id ?? null;

  const enquiry = await db.createEnquiry({ ...parsed.data, budget: parsed.data.budget ?? null, userId });
  await db.addMessage(enquiry.id, { system: true, body: "Enquiry received. Our team will reply here shortly." });
  await notifyNewEnquiry(enquiry);

  revalidatePath("/dashboard");
  if (user) redirect(`/dashboard/enquiries/${enquiry.id}`);
  return {
    ok: true,
    message: `Thank you! Enquiry #${enquiry.id.slice(-6).toUpperCase()} is received. We will contact you on WhatsApp shortly.`,
  };
}

export async function updateEnquiry(id: string, f: FormData) {
  const user = await requireUser(["ADMIN", "STAFF"]);
  const e = await db.getEnquiry(id);
  if (!e || !canAccessEnquiry(user, e)) return;

  const data: { status?: string; assignedToId?: string | null; assignedToName?: string | null } = {};
  const status = str(f, "status");
  if (STATUSES.includes(status as (typeof STATUSES)[number]) && status !== e.status) data.status = status;
  let assignedName: string | null = null;
  if (user.role === "ADMIN" && f.has("assignedToId")) {
    const a = str(f, "assignedToId") || null;
    if (a !== e.assignedToId) {
      const staff = a ? await db.getUserById(a) : null;
      assignedName = staff?.name ?? null;
      data.assignedToId = staff ? staff.id : null;
      data.assignedToName = assignedName;
    }
  }
  if (!Object.keys(data).length) return;

  await db.updateEnquiry(id, data);
  const notes: string[] = [];
  if (data.status) notes.push(`Status changed to ${data.status.replace("_", " ").toLowerCase()}`);
  if ("assignedToId" in data) notes.push(assignedName ? `Assigned to ${assignedName}` : "Unassigned");
  await db.addMessage(id, { system: true, body: `${notes.join(" · ")} by ${user.name}` });
  revalidatePath(`/dashboard/enquiries/${id}`);
  revalidatePath("/dashboard");
}

export async function sendWhatsApp(id: string, f: FormData) {
  const user = await requireUser(["ADMIN", "STAFF"]);
  const e = await db.getEnquiry(id);
  const body = str(f, "body");
  if (!e || !body || !canAccessEnquiry(user, e)) return;
  const log = await sendManual(id, e.phone, body);
  await db.addMessage(id, {
    system: true,
    body: `WhatsApp message ${log.status.toLowerCase()} by ${user.name}: "${body.slice(0, 200)}"`,
  });
  revalidatePath(`/dashboard/enquiries/${id}`);
}

export async function deleteEnquiry(id: string) {
  await requireUser(["ADMIN"]);
  await db.deleteEnquiry(id);
  revalidatePath("/dashboard");
  redirect("/dashboard/enquiries");
}

/* ---------- Users (admin) ---------- */

export async function adminCreateUser(_: FormState, f: FormData): Promise<FormState> {
  await requireUser(["ADMIN"]);
  const parsed = registerSchema.extend({ role: z.enum(["USER", "STAFF", "ADMIN"]) }).safeParse({
    name: str(f, "name"),
    email: str(f, "email").toLowerCase(),
    phone: str(f, "phone"),
    password: str(f, "password"),
    role: str(f, "role") || "STAFF",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const created = await db.createUser({ ...parsed.data, password: await bcrypt.hash(parsed.data.password, 10) });
  if (!created) return { error: "Email already in use" };
  revalidatePath("/dashboard/users");
  return { ok: true, message: `${parsed.data.name} added as ${parsed.data.role.toLowerCase()}` };
}

export async function adminUpdateUser(id: string, f: FormData) {
  const me = await requireUser(["ADMIN"]);
  if (id === me.id) return; // never lock yourself out
  const role = str(f, "role");
  const active = f.has("active") ? str(f, "active") === "true" : undefined;
  await db.updateUser(id, {
    ...(["USER", "STAFF", "ADMIN"].includes(role) ? { role: role as db.Role } : {}),
    ...(active !== undefined ? { active } : {}),
  });
  revalidatePath("/dashboard", "layout");
}

export async function updateProfile(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(f, "name");
  const phone = str(f, "phone");
  const password = str(f, "password");
  if (name.length < 2) return { error: "Enter your name" };
  if (password && password.length < 6) return { error: "Password must be at least 6 characters" };
  await db.updateUser(user.id, { name, phone: phone || null, ...(password ? { password: await bcrypt.hash(password, 10) } : {}) });
  revalidatePath("/dashboard");
  return { ok: true, message: "Profile saved" };
}
