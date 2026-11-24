"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Printer } from "lucide-react";
import { amountFor, fmtClock, fmtDuration, fmtMoney, msToHours } from "@/lib/portal-config";

function useNow(active: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const every = active ? setInterval(tick, 1000) : undefined;
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [active]);
  return now;
}

/** Ticking hh:mm:ss since `startedAt`. */
export function LiveClock({ startedAt, className }: { startedAt: string; className?: string }) {
  const now = useNow(true);
  const ms = now === null ? 0 : now - new Date(startedAt).getTime();
  return (
    <span className={`font-mono tabular-nums ${className ?? ""}`} suppressHydrationWarning>
      {fmtClock(ms)}
    </span>
  );
}

/**
 * Total of finished time (`baseMs`) plus every running timer, updated each second.
 * `show` picks what to render: a duration, decimal hours, or money at `rate`.
 */
export function LiveTotal({
  baseMs,
  running,
  show,
  rate = 0,
  currency = "INR",
  serverNow,
}: {
  baseMs: number;
  running: string[];
  show: "duration" | "hours" | "money";
  rate?: number;
  currency?: string;
  /** Server render time, so the first paint matches the server HTML. */
  serverNow: number;
}) {
  const now = useNow(running.length > 0) ?? serverNow;
  const ms = baseMs + running.reduce((s, r) => s + Math.max(0, now - new Date(r).getTime()), 0);
  const text = show === "money" ? fmtMoney(amountFor(ms, rate), currency) : show === "hours" ? `${msToHours(ms).toFixed(2)} h` : fmtDuration(ms);
  return <span suppressHydrationWarning>{text}</span>;
}

/** Submit button that shows a spinner while its form's server action runs. */
export function PendingButton({ children, className, pendingText }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {pendingText ?? "Saving…"}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Asks for confirmation before submitting a destructive form. */
export function ConfirmButton({ children, className, message }: { children: React.ReactNode; className?: string; message: string }) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function PrintButton({ label = "Print / Save PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-ghost !min-h-10 !px-4 !py-2 text-sm print:hidden">
      <Printer size={16} aria-hidden="true" /> {label}
    </button>
  );
}
