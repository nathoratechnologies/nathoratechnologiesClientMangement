import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { FILE_CHUNK, FILE_MAX, canViewProject, createFile, getProject } from "@/lib/portal";

/** Step 1 of an upload: register the file and get its id + chunk size. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/projects/[id]/files">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
  const project = await getProject(id);
  if (!project || !(await canViewProject(user, project))) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const b = (await req.json().catch(() => ({}))) as { name?: string; type?: string; size?: number; note?: string };
  const name = String(b.name ?? "").trim().replace(/[\/\r\n"]+/g, "_").slice(0, 180);
  const size = Number(b.size);
  if (!name) return NextResponse.json({ error: "File has no name" }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0) return NextResponse.json({ error: "File is empty" }, { status: 400 });
  if (size > FILE_MAX) return NextResponse.json({ error: `Files can be up to ${FILE_MAX / 1024 / 1024} MB` }, { status: 413 });

  const file = await createFile({
    projectId: project.id,
    clientId: project.clientId,
    name,
    type: String(b.type ?? "").slice(0, 120) || "application/octet-stream",
    size,
    note: String(b.note ?? "").trim().slice(0, 300),
    uploadedById: user.id,
    uploadedByName: user.name,
    uploaderRole: user.role,
  });
  return NextResponse.json({ id: file.id, chunks: file.chunks, chunkSize: FILE_CHUNK });
}
