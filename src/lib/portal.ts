import "server-only";
import { FieldValue, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { connection } from "next/server";
import { firestore } from "./firebase";
import { fromDoc, toDate } from "./db";

/* ---------- Types ---------- */

/** userId -> name of everyone with a timer running on this project / bug right now. */
export type WorkingNow = Record<string, string>;

export type Project = {
  id: string;
  name: string;
  description: string;
  clientId: string;
  clientName: string;
  status: string;
  hourlyRate: number;
  currency: string;
  liveUrl: string | null;
  workingNow: WorkingNow;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectUpdate = {
  id: string;
  kind: string;
  title: string;
  body: string;
  authorName: string;
  createdAt: Date;
};

export type Bug = {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assignedToId: string | null;
  assignedToName: string | null;
  reportedById: string;
  reportedByName: string;
  workingNow: WorkingNow;
  createdAt: Date;
  updatedAt: Date;
};

export type BugNote = {
  id: string;
  body: string;
  system: boolean;
  authorName: string | null;
  authorRole: string | null;
  createdAt: Date;
};

export type TimeEntry = {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  bugId: string | null;
  bugTitle: string | null;
  userId: string;
  userName: string;
  note: string;
  startedAt: Date;
  endedAt: Date | null;
  manual: boolean;
};

/* ---------- Collections ---------- */

const projects = () => firestore.collection("projects");
const updates = (projectId: string) => projects().doc(projectId).collection("updates");
const bugs = () => firestore.collection("bugs");
const bugNotes = (bugId: string) => bugs().doc(bugId).collection("notes");
const entries = () => firestore.collection("timeEntries");

const byNewest = <T extends { createdAt: Date }>(a: T, b: T) => b.createdAt.getTime() - a.createdAt.getTime();

const projectOf = (d: DocumentSnapshot): Project => {
  const p = fromDoc<Project>(d, ["createdAt", "updatedAt"]);
  return { ...p, hourlyRate: Number(p.hourlyRate) || 0, currency: p.currency || "INR", liveUrl: p.liveUrl ?? null, workingNow: p.workingNow ?? {} };
};
const updateOf = (d: DocumentSnapshot) => fromDoc<ProjectUpdate>(d, ["createdAt"]);
const bugOf = (d: DocumentSnapshot): Bug => {
  const b = fromDoc<Bug>(d, ["createdAt", "updatedAt"]);
  return { ...b, workingNow: b.workingNow ?? {} };
};
const noteOf = (d: DocumentSnapshot) => fromDoc<BugNote>(d, ["createdAt"]);
const entryOf = (d: DocumentSnapshot): TimeEntry => {
  const x = d.data() ?? {};
  return {
    id: d.id,
    projectId: x.projectId,
    projectName: x.projectName ?? "",
    clientId: x.clientId ?? "",
    bugId: x.bugId ?? null,
    bugTitle: x.bugTitle ?? null,
    userId: x.userId,
    userName: x.userName ?? "",
    note: x.note ?? "",
    startedAt: toDate(x.startedAt),
    endedAt: x.endedAt ? toDate(x.endedAt) : null,
    manual: !!x.manual,
  };
};

/** Current time for a request-time render (Cache Components needs connection() before Date.now()). */
export async function requestTime() {
  await connection();
  return Date.now();
}

/** Length of an entry; a running entry counts up to `now`. */
export const entryMs = (e: Pick<TimeEntry, "startedAt" | "endedAt">, now = Date.now()) =>
  Math.max(0, (e.endedAt ? e.endedAt.getTime() : now) - e.startedAt.getTime());

/* ---------- Projects ---------- */

export async function listProjects(scope: { clientId?: string } = {}) {
  const q = scope.clientId ? projects().where("clientId", "==", scope.clientId) : projects();
  return (await q.get()).docs.map(projectOf).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}

export async function getProject(id: string) {
  const d = await projects().doc(id).get();
  return d.exists ? projectOf(d) : null;
}

export async function createProject(p: Pick<Project, "name" | "description" | "clientId" | "clientName" | "status" | "hourlyRate" | "currency" | "liveUrl">) {
  const now = new Date();
  const ref = await projects().add({ ...p, workingNow: {}, createdAt: now, updatedAt: now });
  return (await getProject(ref.id))!;
}

export async function updateProject(id: string, data: Partial<Pick<Project, "name" | "description" | "status" | "hourlyRate" | "currency" | "liveUrl">>) {
  await projects().doc(id).update({ ...data, updatedAt: new Date() });
}

/** Removes the project with its updates, bugs (and their notes), documents and time entries. */
export async function deleteProject(id: string) {
  const [b, t, f] = await Promise.all([
    bugs().where("projectId", "==", id).get(),
    entries().where("projectId", "==", id).get(),
    firestore.collection("files").where("projectId", "==", id).get(),
  ]);
  await Promise.all([...b.docs, ...f.docs].map((d) => firestore.recursiveDelete(d.ref)));
  for (let i = 0; i < t.docs.length; i += 400) {
    const batch = firestore.batch();
    t.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await firestore.recursiveDelete(projects().doc(id));
}

/* ---------- Project updates (changelog) ---------- */

export async function listUpdates(projectId: string, max = 100) {
  return (await updates(projectId).orderBy("createdAt", "desc").limit(max).get()).docs.map(updateOf);
}

export async function addUpdate(projectId: string, u: Omit<ProjectUpdate, "id" | "createdAt">) {
  const now = new Date();
  await updates(projectId).add({ ...u, createdAt: now });
  await projects().doc(projectId).update({ updatedAt: now });
}

export async function deleteUpdate(projectId: string, updateId: string) {
  await updates(projectId).doc(updateId).delete();
}

/* ---------- Bugs ---------- */

export type BugScope = { projectId?: string; clientId?: string; assignedToId?: string };

export async function listBugs(scope: BugScope = {}) {
  let q: FirebaseFirestore.Query = bugs();
  if (scope.projectId) q = q.where("projectId", "==", scope.projectId);
  else if (scope.clientId) q = q.where("clientId", "==", scope.clientId);
  else if (scope.assignedToId) q = q.where("assignedToId", "==", scope.assignedToId);
  return (await q.get()).docs.map(bugOf).sort(byNewest);
}

export async function getBug(id: string) {
  const d = await bugs().doc(id).get();
  return d.exists ? bugOf(d) : null;
}

export async function createBug(b: Omit<Bug, "id" | "createdAt" | "updatedAt" | "status" | "assignedToId" | "assignedToName" | "workingNow">) {
  const now = new Date();
  const ref = await bugs().add({ ...b, status: "REPORTED", assignedToId: null, assignedToName: null, workingNow: {}, createdAt: now, updatedAt: now });
  await projects().doc(b.projectId).update({ updatedAt: now });
  return (await getBug(ref.id))!;
}

export async function updateBug(id: string, data: Partial<Pick<Bug, "status" | "priority" | "assignedToId" | "assignedToName">>) {
  await bugs().doc(id).update({ ...data, updatedAt: new Date() });
}

export async function deleteBug(id: string) {
  const t = await entries().where("bugId", "==", id).get();
  const batch = firestore.batch();
  // Keep the logged hours on the project; just detach them from the deleted bug.
  t.docs.forEach((d) => batch.update(d.ref, { bugId: null }));
  await batch.commit();
  await firestore.recursiveDelete(bugs().doc(id));
}

export async function listBugNotes(bugId: string) {
  return (await bugNotes(bugId).orderBy("createdAt", "asc").get()).docs.map(noteOf);
}

export async function addBugNote(bugId: string, n: { body: string; system?: boolean; authorName?: string | null; authorRole?: string | null }) {
  await bugNotes(bugId).add({
    body: n.body,
    system: !!n.system,
    authorName: n.authorName ?? null,
    authorRole: n.authorRole ?? null,
    createdAt: new Date(),
  });
}

/* ---------- Time tracking ---------- */

export type EntryScope = { projectId?: string; bugId?: string; userId?: string; clientId?: string };

export async function listEntries(scope: EntryScope = {}) {
  let q: FirebaseFirestore.Query = entries();
  if (scope.projectId) q = q.where("projectId", "==", scope.projectId);
  else if (scope.bugId) q = q.where("bugId", "==", scope.bugId);
  else if (scope.userId) q = q.where("userId", "==", scope.userId);
  else if (scope.clientId) q = q.where("clientId", "==", scope.clientId);
  return (await q.get()).docs.map(entryOf).sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/** Timers that are running right now (optionally only one person's). */
export async function listRunning(userId?: string) {
  let q: FirebaseFirestore.Query = entries().where("endedAt", "==", null);
  if (userId) q = q.where("userId", "==", userId);
  return (await q.get()).docs.map(entryOf);
}

export async function getEntry(id: string) {
  const d = await entries().doc(id).get();
  return d.exists ? entryOf(d) : null;
}

/** Inside a transaction: close a running entry and clear the "working now" flags. */
function closeEntry(tx: Transaction, e: TimeEntry, at: Date) {
  tx.update(entries().doc(e.id), { endedAt: at });
  tx.update(projects().doc(e.projectId), { [`workingNow.${e.userId}`]: FieldValue.delete() });
  if (e.bugId) tx.update(bugs().doc(e.bugId), { [`workingNow.${e.userId}`]: FieldValue.delete() });
}

/**
 * Starts a timer for `user` on a project (and optionally a bug).
 * A person can only run one timer at a time, so any running one is stopped first.
 */
export async function startTimer(user: { id: string; name: string }, project: Project, bug: Bug | null, note: string, startedAt?: Date) {
  const now = new Date();
  const start = startedAt ?? now;
  const ref = entries().doc();
  await firestore.runTransaction(async (tx) => {
    const running = (await tx.get(entries().where("endedAt", "==", null).where("userId", "==", user.id))).docs.map(entryOf);
    // Firestore needs every read before any write.
    const bugDocs = await Promise.all(running.filter((r) => r.bugId).map((r) => tx.get(bugs().doc(r.bugId!))));
    const liveBugs = new Set(bugDocs.filter((d) => d.exists).map((d) => d.id));
    // A back-dated start ("I began at 7:30") ends the previous timer at that moment.
    for (const r of running) {
      const end = new Date(Math.max(r.startedAt.getTime(), Math.min(start.getTime(), now.getTime())));
      closeEntry(tx, { ...r, bugId: r.bugId && liveBugs.has(r.bugId) ? r.bugId : null }, end);
    }

    tx.set(ref, {
      projectId: project.id,
      projectName: project.name,
      clientId: project.clientId,
      bugId: bug?.id ?? null,
      bugTitle: bug?.title ?? null,
      userId: user.id,
      userName: user.name,
      note,
      startedAt: start,
      endedAt: null,
      manual: false,
      createdAt: now,
    });
    tx.update(projects().doc(project.id), { [`workingNow.${user.id}`]: user.name, updatedAt: now });
    if (bug) tx.update(bugs().doc(bug.id), { [`workingNow.${user.id}`]: user.name });
  });
  return ref.id;
}

/** Stops a running entry. Returns the closed entry, or null if it was not running. */
export async function stopTimer(entryId: string) {
  const now = new Date();
  return firestore.runTransaction(async (tx) => {
    const d = await tx.get(entries().doc(entryId));
    if (!d.exists) return null;
    const e = entryOf(d);
    if (e.endedAt) return null;
    const bugExists = e.bugId ? (await tx.get(bugs().doc(e.bugId))).exists : false;
    closeEntry(tx, { ...e, bugId: bugExists ? e.bugId : null }, now);
    return { ...e, endedAt: now };
  });
}

export async function addManualEntry(e: Omit<TimeEntry, "id" | "manual">) {
  await entries().add({ ...e, manual: true, createdAt: new Date() });
}

export async function deleteEntry(entryId: string) {
  const e = await getEntry(entryId);
  if (!e) return;
  if (!e.endedAt) await stopTimer(entryId);
  await entries().doc(entryId).delete();
}

/* ---------- Summaries ---------- */

export type HoursRow = { key: string; label: string; ms: number; count: number };

/** Total time grouped by any key (person, bug, day…). */
export function groupHours(list: TimeEntry[], key: (e: TimeEntry) => [string, string], now = Date.now()): HoursRow[] {
  const map = new Map<string, HoursRow>();
  for (const e of list) {
    const [k, label] = key(e);
    const row = map.get(k) ?? { key: k, label, ms: 0, count: 0 };
    row.ms += entryMs(e, now);
    row.count++;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.ms - a.ms);
}

export const totalMs = (list: TimeEntry[], now = Date.now()) => list.reduce((s, e) => s + entryMs(e, now), 0);

/* ---------- Project documents (stored in Firestore in <1 MB chunks) ---------- */

/** Bytes per chunk: a Firestore document holds at most ~1 MiB, and Vercel accepts ≤4.5 MB per request. */
export const FILE_CHUNK = 768 * 1024;
export const FILE_MAX = 25 * 1024 * 1024;

export type ProjectFile = {
  id: string;
  projectId: string;
  clientId: string;
  name: string;
  type: string;
  size: number;
  chunks: number;
  note: string;
  status: "UPLOADING" | "READY";
  uploadedById: string;
  uploadedByName: string;
  uploaderRole: string;
  createdAt: Date;
};

const files = () => firestore.collection("files");
const fileChunks = (id: string) => files().doc(id).collection("chunks");
const fileOf = (d: DocumentSnapshot) => fromDoc<ProjectFile>(d, ["createdAt"]);

/** Who may see a project: admin, its client, or staff with a bug assigned on it. */
export async function canViewProject(user: { id: string; role: string }, p: { id: string; clientId: string }) {
  if (user.role === "ADMIN") return true;
  if (user.role === "USER") return p.clientId === user.id;
  return (await listBugs({ assignedToId: user.id })).some((b) => b.projectId === p.id);
}

export async function listFiles(projectId: string) {
  return (await files().where("projectId", "==", projectId).get()).docs
    .map(fileOf)
    .filter((f) => f.status === "READY")
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getFile(id: string) {
  const d = await files().doc(id).get();
  return d.exists ? fileOf(d) : null;
}

export async function createFile(f: Omit<ProjectFile, "id" | "chunks" | "status" | "createdAt">) {
  const ref = await files().add({ ...f, chunks: Math.max(1, Math.ceil(f.size / FILE_CHUNK)), status: "UPLOADING", createdAt: new Date() });
  return (await getFile(ref.id))!;
}

export async function putFileChunk(id: string, index: number, data: Buffer) {
  await fileChunks(id).doc(String(index).padStart(5, "0")).set({ i: index, data });
}

/** Marks the upload complete once every chunk is present and the sizes add up. */
export async function completeFile(f: ProjectFile) {
  const snap = await fileChunks(f.id).select("i").get();
  if (snap.size !== f.chunks) return false;
  await files().doc(f.id).update({ status: "READY" });
  return true;
}

export async function readFile(id: string) {
  const snap = await fileChunks(id).orderBy("i").get();
  return Buffer.concat(snap.docs.map((d) => Buffer.from(d.get("data") as Uint8Array)));
}

export async function deleteFile(id: string) {
  await firestore.recursiveDelete(files().doc(id));
}

/** Keep the client name copied onto projects in sync after the client's details change. */
export async function renameClientProjects(clientId: string, clientName: string) {
  const q = await projects().where("clientId", "==", clientId).get();
  if (q.empty) return;
  const batch = firestore.batch();
  q.docs.forEach((d) => batch.update(d.ref, { clientName }));
  await batch.commit();
}
