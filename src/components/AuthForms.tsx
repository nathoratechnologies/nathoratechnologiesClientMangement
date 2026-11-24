"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { login, register, type FormState } from "@/lib/actions";
import { LogoMark } from "./Logo";

function Shell({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" aria-hidden="true" />
      <div className="absolute top-1/4 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-navy-700/50 blur-[120px]" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="card relative w-full max-w-md p-8 backdrop-blur-xl sm:p-10"
      >
        <Link href="/" className="mx-auto mb-6 block w-fit" aria-label="Back to home">
          <LogoMark size={64} animate />
        </Link>
        <h1 className="font-display text-center text-3xl font-bold">{title}</h1>
        <p className="mt-2 mb-8 text-center text-mist">{sub}</p>
        {children}
      </motion.div>
    </main>
  );
}

function ErrorText({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
      {state.error}
    </p>
  );
}

function NextField() {
  const next = useSearchParams().get("next") ?? "";
  return <input type="hidden" name="next" value={next} />;
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <Shell title="Welcome back" sub="Sign in to your Nathora account">
      <form action={action} className="grid gap-5">
        <Suspense fallback={null}>
          <NextField />
        </Suspense>
        <div>
          <label className="label" htmlFor="email">Email or username</label>
          <input id="email" name="email" type="text" className="input" required autoComplete="username" autoCapitalize="none" spellCheck={false} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" required autoComplete="current-password" />
        </div>
        <ErrorText state={state} />
        <button className="btn-gold w-full" disabled={pending}>
          {pending && <Loader2 size={18} className="animate-spin" />} Sign in
        </button>
        <p className="text-center text-sm text-mist">
          New here? <Link href="/register" className="font-semibold text-gold-400 hover:underline">Create an account</Link>
        </p>
      </form>
    </Shell>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(register, undefined);
  return (
    <Shell title="Create account" sub="Track enquiries and chat with our team">
      <form action={action} className="grid gap-5">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" name="name" className="input" required autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone / WhatsApp</label>
          <input id="phone" name="phone" type="tel" className="input" required autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" className="input" required minLength={6} autoComplete="new-password" />
        </div>
        <ErrorText state={state} />
        <button className="btn-gold w-full" disabled={pending}>
          {pending && <Loader2 size={18} className="animate-spin" />} Create account
        </button>
        <p className="text-center text-sm text-mist">
          Already have an account? <Link href="/login" className="font-semibold text-gold-400 hover:underline">Sign in</Link>
        </p>
      </form>
    </Shell>
  );
}
