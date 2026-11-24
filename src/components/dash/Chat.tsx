"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Send, Loader2 } from "lucide-react";

type Msg = {
  id: string;
  body: string;
  system: boolean;
  createdAt: string;
  sender: { id: string; name: string; role: string } | null;
};

/** Enquiry chat. Polls every 3 s for new messages (works on any host, no websocket server needed). */
export function Chat({ enquiryId, meId, initial }: { enquiryId: string; meId: string; initial: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(initial.at(-1)?.createdAt);

  const merge = useCallback((incoming: Msg[]) => {
    if (!incoming.length) return;
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id));
      const next = [...prev, ...incoming.filter((m) => !ids.has(m.id))];
      lastRef.current = next.at(-1)?.createdAt;
      return next;
    });
  }, []);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      const q = lastRef.current ? `?after=${encodeURIComponent(lastRef.current)}` : "";
      const res = await fetch(`/api/enquiries/${enquiryId}/messages${q}`, { cache: "no-store" }).catch(() => null);
      if (!stop && res?.ok) merge((await res.json()).messages);
    };
    const t = setInterval(tick, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [enquiryId, merge]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setSending(true);
    setError("");
    const res = await fetch(`/api/enquiries/${enquiryId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }).catch(() => null);
    setSending(false);
    if (!res?.ok) return setError("Message not sent. Check your connection and try again.");
    merge([(await res.json()).message]);
    setText("");
  }

  return (
    <div className="card flex h-[65dvh] min-h-[420px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="font-display font-semibold">Chat</h2>
        <span className="flex items-center gap-2 text-xs text-mist">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live
        </span>
      </div>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            if (m.system) {
              return (
                <motion.p key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto w-fit max-w-[90%] rounded-full bg-white/5 px-4 py-1.5 text-center text-xs text-mist">
                  {m.body}
                </motion.p>
              );
            }
            const mine = m.sender?.id === meId;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 ${mine ? "rounded-br-md bg-gradient-to-br from-gold-300 to-gold-500 text-navy-950" : "rounded-bl-md bg-navy-800 text-white"}`}>
                  {!mine && (
                    <p className="mb-0.5 text-xs font-semibold text-gold-400">
                      {m.sender?.name ?? "Deleted user"}
                      {m.sender && m.sender.role !== "USER" ? " · Nathora team" : ""}
                    </p>
                  )}
                  <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{m.body}</p>
                  <p className={`mt-1 text-right text-[10px] ${mine ? "text-navy-900/70" : "text-mist/70"}`}>
                    {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {error && <p role="alert" className="px-5 pb-2 text-sm text-red-300">{error}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-white/10 p-3">
        <label htmlFor="chat-input" className="sr-only">Type a message</label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="input !rounded-full"
          autoComplete="off"
        />
        <button className="btn-gold !h-12 !w-12 shrink-0 !p-0" disabled={sending || !text.trim()} aria-label="Send message">
          {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
