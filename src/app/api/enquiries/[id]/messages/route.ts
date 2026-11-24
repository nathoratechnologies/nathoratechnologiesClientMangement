import { NextRequest, NextResponse } from "next/server";
import { addMessage, getEnquiry, listMessages, updateEnquiry } from "@/lib/db";
import { getUser, canAccessEnquiry } from "@/lib/auth";

async function guard(id: string) {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const e = await getEnquiry(id);
  if (!e || !canAccessEnquiry(user, e)) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) } as const;
  return { user, enquiry: e } as const;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;
  const after = req.nextUrl.searchParams.get("after");
  const messages = await listMessages(id, after ? new Date(after) : undefined);
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const g = await guard(id);
  if ("error" in g) return g.error;
  const { body } = (await req.json().catch(() => ({}))) as { body?: string };
  const text = String(body ?? "").trim().slice(0, 4000);
  if (!text) return NextResponse.json({ error: "Empty message" }, { status: 400 });
  const message = await addMessage(id, { body: text, sender: { id: g.user.id, name: g.user.name, role: g.user.role } });
  // A team reply on a brand-new enquiry moves it forward automatically
  if (g.user.role !== "USER" && g.enquiry.status === "NEW") await updateEnquiry(id, { status: "IN_PROGRESS" });
  return NextResponse.json({ message });
}
