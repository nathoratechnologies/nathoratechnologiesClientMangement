"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Loader2, MessageCircle, Phone, MessagesSquare, Mail, Send } from "lucide-react";
import { createEnquiry, type FormState } from "@/lib/actions";
import { SERVICES } from "@/lib/site";
import Link from "next/link";

const prefs = [
  { v: "WHATSAPP", label: "WhatsApp", icon: MessageCircle },
  { v: "CALL", label: "Call me", icon: Phone },
  { v: "CHAT", label: "Chat", icon: MessagesSquare },
  { v: "EMAIL", label: "Email", icon: Mail },
];

export function EnquiryForm({ signedIn = false, compact = false, defaultPhone = "" }: { signedIn?: boolean; compact?: boolean; defaultPhone?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createEnquiry, undefined);
  const [pref, setPref] = useState("WHATSAPP");
  const [key, setKey] = useState(0);

  if (state?.ok) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-10 text-center">
        <motion.div initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 12 }}>
          <CheckCircle2 size={72} className="text-gold-400" aria-hidden="true" />
        </motion.div>
        <h3 className="font-display mt-6 text-2xl font-semibold">Enquiry sent</h3>
        <p className="mt-3 max-w-md text-mist">{state.message}</p>
        <p className="mt-2 max-w-md text-sm text-mist/80">
          Create a free account with the same email to chat with our team and track progress.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="btn-gold">
            Create account
          </Link>
          <button className="btn-ghost" onClick={() => setKey((k) => k + 1)}>
            Send another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <form key={key} action={action} className="grid gap-5">
      {!signedIn && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" name="name" className="input" placeholder="Your name" required autoComplete="name" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone / WhatsApp</label>
            <input id="phone" name="phone" type="tel" className="input" placeholder="+91 98xxxxxxxx" required autoComplete="tel" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" placeholder="you@company.com" required autoComplete="email" />
          </div>
        </div>
      )}
      {signedIn && (
        <div>
          <label className="label" htmlFor="phone">Phone / WhatsApp</label>
          <input id="phone" name="phone" type="tel" className="input" defaultValue={defaultPhone} required autoComplete="tel" />
        </div>
      )}
      <div className={`grid gap-5 ${compact ? "" : "sm:grid-cols-2"}`}>
        <div>
          <label className="label" htmlFor="service">Service</label>
          <select id="service" name="service" className="input" required defaultValue="">
            <option value="" disabled>Choose a service</option>
            {SERVICES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="budget">Budget (optional)</label>
          <select id="budget" name="budget" className="input" defaultValue="">
            <option value="">Not sure yet</option>
            <option>Under ₹25,000</option>
            <option>₹25,000 – ₹1,00,000</option>
            <option>₹1,00,000 – ₹5,00,000</option>
            <option>Above ₹5,00,000</option>
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="label">How should we contact you?</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {prefs.map((p) => (
            <label
              key={p.v}
              className={`flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                pref === p.v ? "border-gold-500 bg-gold-500/15 text-gold-300" : "border-white/12 text-mist hover:border-white/30"
              }`}
            >
              <input type="radio" name="preferred" value={p.v} checked={pref === p.v} onChange={() => setPref(p.v)} className="sr-only" />
              <p.icon size={16} aria-hidden="true" />
              {p.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="message">Tell us about your project</label>
        <textarea id="message" name="message" rows={compact ? 4 : 5} className="input resize-none" placeholder="What do you want to build? Any deadline or reference sites?" required minLength={10} />
      </div>

      <AnimatePresence>
        {state?.error && (
          <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>

      <button type="submit" disabled={pending} className="btn-gold w-full sm:w-auto sm:justify-self-start">
        {pending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
