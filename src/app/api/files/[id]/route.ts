import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { FILE_CATEGORY_LABEL } from "@/lib/portal-config";
import { FILE_CHUNK, addUpdate, canViewProject, completeFile, getFile, getProject, putFileChunk, readFile } from "@/lib/portal";
import { notifyAdmin } from "@/lib/whatsapp";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Only the person who started an upload may add chunks to it or finish it. */
async function ownUpload(id: string) {
  const user = await getUser();
  if (!user) return { error: fail("Please sign in again", 401) } as const;
  const file = await getFile(id);
  if (!file || file.uploadedById !== user.id) return { error: fail("Upload not found", 404) } as const;
  if (file.status !== "UPLOADING") return { error: fail("Upload already finished", 409) } as const;
  return { user, file } as const;
}

/** Step 2: send chunk number ?i=N as the raw request body. */
export async function PUT(req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const g = await ownUpload(id);
  if ("error" in g) return g.error;
  const i = Number(req.nextUrl.searchParams.get("i"));
  if (!Number.isInteger(i) || i < 0 || i >= g.file.chunks) return fail("Bad chunk number", 400);
  const data = Buffer.from(await req.arrayBuffer());
  const expected = i === g.file.chunks - 1 ? g.file.size - FILE_CHUNK * i : FILE_CHUNK;
  if (data.length !== expected) return fail("Chunk size mismatch", 400);
  await putFileChunk(id, i, data);
  return NextResponse.json({ ok: true });
}

/** Step 3: finish the upload. */
export async function POST(_req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const g = await ownUpload(id);
  if ("error" in g) return g.error;
  if (!(await completeFile(g.file))) return fail("Some parts of the file are missing. Please upload it again.", 400);
  const project = await getProject(g.file.projectId);
  if (project) {
    await addUpdate(project.id, { kind: "NOTE", title: `${FILE_CATEGORY_LABEL[g.file.category] ?? "Document"} shared: ${g.file.name}`, body: g.file.note, authorName: g.user.name });
    if (g.user.role === "USER") await notifyAdmin(`${g.user.name} uploaded a document on ${project.name}: ${g.file.name}`);
  }
  revalidatePath("/dashboard", "layout");
  return NextResponse.json({ ok: true });
}

/**
 * Download. Files are sent as attachments so nothing uploaded can run as a page on this site;
 * only a PDF may open in the browser's PDF viewer, with ?view=1.
 */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/files/[id]">) {
  const { id } = await ctx.params;
  const user = await getUser();
  if (!user) return fail("Please sign in", 401);
  const file = await getFile(id);
  const project = file ? await getProject(file.projectId) : null;
  if (!file || file.status !== "READY" || !project || !(await canViewProject(user, project))) return fail("Not found", 404);

  const body = await readFile(id);
  const risky = /html|svg|xml|javascript/i.test(file.type);
  const pdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const inline = pdf && req.nextUrl.searchParams.get("view") === "1";
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": inline ? "application/pdf" : risky ? "application/octet-stream" : file.type,
      "Content-Length": String(body.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${file.name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
