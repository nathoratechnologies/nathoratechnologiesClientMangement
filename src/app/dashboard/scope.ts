import type { Scope } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";

/** Which enquiries each role may see. */
export function scopeFor(user: CurrentUser): Scope {
  if (user.role === "ADMIN") return {};
  if (user.role === "STAFF") return { assignedToId: user.id };
  return { userId: user.id };
}
