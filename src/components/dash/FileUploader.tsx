"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2 } from "lucide-react";

const MAX_MB = 25;

async function call(url: string, init: RequestInit) {
  const res = await fetch(url, init);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
  return json;
}

/** Uploads files in chunks to /api/projects/[id]/files with a progress bar. */
export function FileUploader({ projectId }: { projectId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<{ name: string; pct: number } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setMsg(null);
    const done: string[] = [];
    try {
      for (const file of Array.from(list)) {
        if (file.size > MAX_MB * 1024 * 1024) throw new Error(`${file.name} is larger than ${MAX_MB} MB`);
        if (!file.size) throw new Error(`${file.name} is empty`);
        setBusy({ name: file.name, pct: 0 });
        const { id, chunks, chunkSize } = await call(`/api/projects/${projectId}/files`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, type: file.type, size: file.size, note }),
        });
        for (let i = 0; i < chunks; i++) {
          await call(`/api/files/${id}?i=${i}`, { method: "PUT", body: file.slice(i * chunkSize, (i + 1) * chunkSize) });
          setBusy({ name: file.name, pct: Math.round(((i + 1) / chunks) * 100) });
        }
        await call(`/api/files/${id}`, { method: "POST" });
        done.push(file.name);
      }
      setMsg({ ok: true, text: `Uploaded: ${done.join(", ")}` });
      setNote("");
    } catch (e) {
      setMsg({ ok: false, text: (done.length ? `Uploaded ${done.join(", ")}. ` : "") + (e as Error).message });
    } finally {
      setBusy(null);
      if (input.current) input.current.value = "";
      router.refresh();
    }
  }

  return (
    <div className="grid gap-4">
      <div>
        <label className="label" htmlFor="f-note">Note (optional)</label>
        <input id="f-note" value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="e.g. Logo files, content for the About page" disabled={!!busy} />
      </div>
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${busy ? "border-gold-500/50" : "border-white/15 hover:border-gold-500/60 hover:bg-white/[0.03]"}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) upload(e.dataTransfer.files);
        }}
      >
        {busy ? <Loader2 size={26} className="animate-spin text-gold-400" aria-hidden="true" /> : <Upload size={26} className="text-gold-400" aria-hidden="true" />}
        <span className="font-semibold">{busy ? `Uploading ${busy.name}…` : "Choose files or drop them here"}</span>
        <span className="text-xs text-mist">PDF, Word, Excel, images, ZIP… up to {MAX_MB} MB each</span>
        <input ref={input} type="file" multiple className="sr-only" disabled={!!busy} onChange={(e) => upload(e.target.files)} />
      </label>
      {busy && (
        <div className="h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={busy.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Upload progress">
          <div className="h-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all" style={{ width: `${busy.pct}%` }} />
        </div>
      )}
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm break-words ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}
    </div>
  );
}
