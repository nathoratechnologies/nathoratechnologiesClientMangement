import { Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { firestore } from "./firebase";

/* ---------- Types ---------- */

export type Role = "USER" | "STAFF" | "ADMIN";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Optional login name (admin-created client accounts). */
  username?: string | null;
  /** Company / business name, mostly for clients. */
  company?: string | null;
  password: string;
  role: Role;
  active: boolean;
  createdAt: Date;
};

export type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  budget: string | null;
  message: string;
  preferred: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
};

export type Message = {
  id: string;
  body: string;
  system: boolean;
  createdAt: Date;
  sender: { id: string; name: string; role: string } | null;
};

export type WhatsAppLog = {
  id: string;
  to: string;
  kind: string;
  body: string;
  status: string;
  detail: string | null;
  createdAt: Date;
  enquiryId: string | null;
};

/* ---------- Helpers ---------- */

const users = () => firestore.collection("users");
const enquiries = () => firestore.collection("enquiries");
const messages = (enquiryId: string) => enquiries().doc(enquiryId).collection("messages");
const logs = () => firestore.collection("whatsappLogs");

export const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : v instanceof Date ? v : new Date(String(v ?? 0)));

export function fromDoc<T>(d: DocumentSnapshot, dateKeys: string[]): T {
  const data = d.data() ?? {};
  const out: Record<string, unknown> = { id: d.id, ...data };
  for (const k of dateKeys) out[k] = toDate(data[k]);
  return out as T;
}

const userOf = (d: DocumentSnapshot) => fromDoc<User>(d, ["createdAt"]);
const enquiryOf = (d: DocumentSnapshot) => fromDoc<Enquiry>(d, ["createdAt", "updatedAt"]);
const logOf = (d: DocumentSnapshot) => fromDoc<WhatsAppLog>(d, ["createdAt"]);
function messageOf(d: DocumentSnapshot): Message {
  const x = d.data() ?? {};
  return {
    id: d.id,
    body: x.body,
    system: !!x.system,
    createdAt: toDate(x.createdAt),
    sender: x.senderId ? { id: x.senderId, name: x.senderName, role: x.senderRole } : null,
  };
}

const newest = <T extends { createdAt: Date }>(a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime();

/* ---------- Users ---------- */

export async function getUserById(id: string) {
  const d = await users().doc(id).get();
  return d.exists ? userOf(d) : null;
}

export async function getUserByEmail(email: string) {
  const q = await users().where("email", "==", email.toLowerCase()).limit(1).get();
  return q.empty ? null : userOf(q.docs[0]);
}

export async function getUserByUsername(username: string) {
  const q = await users().where("username", "==", username.toLowerCase()).limit(1).get();
  return q.empty ? null : userOf(q.docs[0]);
}

/** Sign-in accepts either an email or a username. */
export async function getUserByLogin(login: string) {
  const v = login.trim().toLowerCase();
  if (!v) return null;
  return v.includes("@") ? getUserByEmail(v) : getUserByUsername(v);
}

/** Creates a user; returns null if the email (or username) is already taken. */
export async function createUser(u: {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
  role?: Role;
  username?: string | null;
  company?: string | null;
}) {
  const email = u.email.toLowerCase();
  const username = u.username ? u.username.toLowerCase() : null;
  const ref = users().doc();
  const created = await firestore.runTransaction(async (tx) => {
    const existing = await tx.get(users().where("email", "==", email).limit(1));
    if (!existing.empty) return false;
    if (username) {
      const taken = await tx.get(users().where("username", "==", username).limit(1));
      if (!taken.empty) return false;
    }
    tx.set(ref, {
      name: u.name,
      email,
      username,
      company: u.company ?? null,
      phone: u.phone ?? null,
      password: u.password,
      role: u.role ?? "USER",
      active: true,
      createdAt: new Date(),
    });
    return true;
  });
  return created ? getUserById(ref.id) : null;
}

export async function updateUser(id: string, data: Partial<Pick<User, "name" | "phone" | "password" | "role" | "active" | "company">>) {
  await users().doc(id).update(data);
}

export async function listUsers() {
  const q = await users().get();
  return q.docs.map(userOf);
}

export async function hasAdmin() {
  const q = await users().where("role", "==", "ADMIN").limit(1).get();
  return !q.empty;
}

/* ---------- Enquiries ---------- */

export type Scope = { userId?: string; assignedToId?: string };

export async function listEnquiries(scope: Scope = {}, max = 1000) {
  let q: FirebaseFirestore.Query = enquiries();
  if (scope.userId) q = q.where("userId", "==", scope.userId);
  else if (scope.assignedToId) q = q.where("assignedToId", "==", scope.assignedToId);
  else q = q.orderBy("createdAt", "desc");
  const snap = await q.limit(max).get();
  return snap.docs.map(enquiryOf).sort(newest);
}

export async function getEnquiry(id: string) {
  const d = await enquiries().doc(id).get();
  return d.exists ? enquiryOf(d) : null;
}

export async function createEnquiry(e: Omit<Enquiry, "id" | "createdAt" | "updatedAt" | "status" | "assignedToId" | "assignedToName">) {
  const now = new Date();
  const ref = await enquiries().add({ ...e, budget: e.budget ?? null, status: "NEW", assignedToId: null, assignedToName: null, createdAt: now, updatedAt: now });
  return (await getEnquiry(ref.id))!;
}

export async function updateEnquiry(id: string, data: Partial<Pick<Enquiry, "status" | "assignedToId" | "assignedToName">>) {
  await enquiries().doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteEnquiry(id: string) {
  await firestore.recursiveDelete(enquiries().doc(id));
}

/** Attach enquiries sent as a guest to the account registered with the same email. */
export async function linkGuestEnquiries(email: string, userId: string) {
  const q = await enquiries().where("email", "==", email.toLowerCase()).get();
  const batch = firestore.batch();
  q.docs.filter((d) => !d.get("userId")).forEach((d) => batch.update(d.ref, { userId }));
  await batch.commit();
}

/* ---------- Messages ---------- */

export async function listMessages(enquiryId: string, after?: Date) {
  let q: FirebaseFirestore.Query = messages(enquiryId).orderBy("createdAt", "asc");
  if (after) q = q.where("createdAt", ">", after);
  return (await q.get()).docs.map(messageOf);
}

export async function addMessage(enquiryId: string, m: { body: string; system?: boolean; sender?: { id: string; name: string; role: string } }) {
  const ref = await messages(enquiryId).add({
    body: m.body,
    system: !!m.system,
    createdAt: new Date(),
    senderId: m.sender?.id ?? null,
    senderName: m.sender?.name ?? null,
    senderRole: m.sender?.role ?? null,
  });
  return messageOf(await ref.get());
}

/* ---------- WhatsApp logs ---------- */

export async function addLog(l: Omit<WhatsAppLog, "id" | "createdAt" | "detail" | "enquiryId"> & { detail?: string | null; enquiryId?: string | null }) {
  const ref = await logs().add({ ...l, detail: l.detail ?? null, enquiryId: l.enquiryId ?? null, createdAt: new Date() });
  return logOf(await ref.get());
}

export async function listLogs(max = 100) {
  return (await logs().orderBy("createdAt", "desc").limit(max).get()).docs.map(logOf);
}

export async function listLogsForEnquiry(enquiryId: string, max = 5) {
  return (await logs().where("enquiryId", "==", enquiryId).get()).docs.map(logOf).sort(newest).slice(0, max);
}
