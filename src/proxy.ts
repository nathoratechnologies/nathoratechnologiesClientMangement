import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const ADMIN_ONLY = ["/dashboard/users", "/dashboard/whatsapp", "/dashboard/clients"];
const TEAM_ONLY = ["/dashboard/time"];
const USER_ONLY = ["/dashboard/enquiries/new"];

// Fast redirects before any page renders. Pages, actions and API routes
// still re-check the user against the database.
export async function proxy(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));

  if (pathname.startsWith("/dashboard")) {
    if (!session) return to(`/login?next=${encodeURIComponent(pathname)}`);
    if (ADMIN_ONLY.some((p) => pathname.startsWith(p)) && session.role !== "ADMIN") return to("/dashboard");
    if (TEAM_ONLY.some((p) => pathname.startsWith(p)) && session.role === "USER") return to("/dashboard");
    if (USER_ONLY.some((p) => pathname.startsWith(p)) && session.role !== "USER") return to("/dashboard");
  }
  if ((pathname === "/login" || pathname === "/register") && session) return to("/dashboard");
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/login", "/register"] };
