import Link from "next/link";
import { Play, Square, Timer } from "lucide-react";
import { startTimer, stopTimer } from "@/lib/portal-actions";
import type { TimeEntry } from "@/lib/portal";
import { LiveClock, PendingButton } from "./Live";

/**
 * Start / stop the current user's timer for a project (and optionally a bug).
 * Only one timer runs per person; starting here stops any other one.
 */
export function TimerControl({ running, projectId, bugId, title = "Time tracker" }: { running: TimeEntry | null; projectId: string; bugId?: string | null; title?: string }) {
  const here = running && running.projectId === projectId && (running.bugId ?? null) === (bugId ?? null);
  return (
    <div className={`card p-5 ${here ? "border-emerald-400/40 bg-emerald-500/[0.06]" : ""}`}>
      <h2 className="font-display mb-3 flex items-center gap-2 font-semibold">
        <Timer size={18} className="text-gold-400" aria-hidden="true" /> {title}
      </h2>

      {running && here ? (
        <>
          <p className="text-sm text-mist">Running since {running.startedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</p>
          <LiveClock startedAt={running.startedAt.toISOString()} className="my-3 block text-4xl font-bold text-emerald-200" />
          {running.note && <p className="mb-3 text-sm text-mist">“{running.note}”</p>}
          <form action={stopTimer.bind(null, running.id)}>
            <PendingButton pendingText="Stopping…" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-red-500/90 font-semibold text-white hover:bg-red-500">
              <Square size={16} fill="currentColor" aria-hidden="true" /> Stop
            </PendingButton>
          </form>
        </>
      ) : (
        <>
          {running && (
            <p className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-mist">
              Your timer is running on{" "}
              <Link className="font-semibold text-white underline" href={running.bugId ? `/dashboard/bugs/${running.bugId}` : `/dashboard/projects/${running.projectId}`}>
                {running.bugTitle ?? running.projectName}
              </Link>{" "}
              (<LiveClock startedAt={running.startedAt.toISOString()} />). Starting here stops it.
            </p>
          )}
          <form action={startTimer} className="grid gap-3">
            <input type="hidden" name="projectId" value={projectId} />
            {bugId && <input type="hidden" name="bugId" value={bugId} />}
            <label htmlFor={`note-${bugId ?? projectId}`} className="sr-only">What are you working on?</label>
            <input id={`note-${bugId ?? projectId}`} name="note" className="input" placeholder="What are you working on? (optional)" />
            <PendingButton pendingText="Starting…" className="btn-gold w-full">
              <Play size={16} fill="currentColor" aria-hidden="true" /> Start timer
            </PendingButton>
          </form>
        </>
      )}
    </div>
  );
}
