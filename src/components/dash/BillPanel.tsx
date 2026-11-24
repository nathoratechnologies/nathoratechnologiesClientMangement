"use client";

import { useActionState, useState } from "react";
import { Copy, Check, MessageCircle, Send } from "lucide-react";
import type { FormState } from "@/lib/actions";

/** Preview of a day's WhatsApp bill with "Open in WhatsApp", "Copy" and (when the API is set up) "Send automatically". */
export function BillPanel({
  text,
  waUrl,
  send,
}: {
  text: string;
  waUrl: string | null;
  /** Server action for sending through the WhatsApp Cloud API; omitted when the API isn't configured. */
  send?: (state: FormState) => Promise<FormState>;
}) {
  const [copied, setCopied] = useState(false);
  const [state, run, pending] = useActionState<FormState, FormData>(async (s) => (send ? send(s) : s), undefined);

  return (
    <div className="grid gap-4">
      <pre className="max-h-80 overflow-auto rounded-xl border border-white/10 bg-navy-950/60 p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap text-mist">{text}</pre>
      <div className="flex flex-wrap gap-2 print:hidden">
        {waUrl ? (
          <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-gold">
            <MessageCircle size={16} aria-hidden="true" /> Open in WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? "Copied" : "Copy text"}
        </button>
        {send && (
          <form action={run}>
            <button className="btn-ghost" disabled={pending}>
              <Send size={16} aria-hidden="true" /> {pending ? "Sending…" : "Send automatically"}
            </button>
          </form>
        )}
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-300">{state.error}</p>}
      {state?.ok && <p role="status" className="text-sm text-emerald-300">{state.message}</p>}
    </div>
  );
}
