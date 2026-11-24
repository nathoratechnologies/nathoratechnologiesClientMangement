import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserById, type Role } from "./db";
import { SESSION_COOKIE, signSession, verifySession } from "./session";

export async function createSession(user: { id: string; role: string; name: string }) {
  const token = await signSession({ uid: user.id, role: user.role as Role, name: user.name });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Current user from the database (null when signed out or disabled). */
export async function getUser() {
  const s = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const u = await getUserById(s.uid);
  if (!u || !u.active) return null;
  return { id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active };
}

export async function requireUser(roles?: Role[]) {
  const user = await getUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getUser>>>;

/** Can this user see/act on the enquiry? */
export function canAccessEnquiry(user: CurrentUser, e: { userId: string | null; assignedToId: string | null }) {
  if (user.role === "ADMIN") return true;
  if (user.role === "STAFF") return e.assignedToId === user.id;
  return e.userId === user.id;
}

/** Can this user open the bug? Staff: only bugs assigned to them. Clients: only bugs on their projects. */
export function canAccessBug(user: CurrentUser, b: { clientId: string; assignedToId: string | null }) {
  if (user.role === "ADMIN") return true;
  if (user.role === "STAFF") return b.assignedToId === user.id;
  return b.clientId === user.id;
}

/** Clients see their own projects. Staff see projects where they have assigned bugs (checked by the caller). */
export function ownsProject(user: CurrentUser, p: { clientId: string }) {
  return user.role === "ADMIN" || (user.role === "USER" && p.clientId === user.id);
}
