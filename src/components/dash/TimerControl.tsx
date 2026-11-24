import Link from "next/link";
import { Square, Timer } from "lucide-react";
import { stopTimer } from "@/lib/portal-actions";
import type { TimeEntry } from "@/lib/portal";
import { LiveClock, PendingButton } from "./Live";
import { TimerStartForm } from "./PortalForms";

const clock = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Stop button; for the admin it can also open the day's WhatsApp bill afterwards. */
export function StopTimerForm({ entryId, admin, compact }: { entryId: string; admin: boolean; compact?: boolean }) {
  return (
    <form action={stopTimer.bind(null, entryId)} className={compact ? "flex items-center gap-3" : "grid gap-3"}>
      {admin && (
        <label className="flex items-center gap-2 text-sm text-mist">
          <input type="checkbox" name="bill" value="1" defaultChecked className="h-4 w-4 accent-[#d4a24c]" />
          Prepare WhatsApp bill
        </label>
      )}
      <PendingButton
        pendingText="Stopping…"
        className={`flex items-center justify-center gap-2 rounded-full bg-red-500/90 font-semibold text-white hover:bg-red-500 ${compact ? "min-h-10 px-5 text-sm" : "min-h-11 w-full"}`}
      >
        <Square size={14} fill="currentColor" aria-hidden="true" /> Stop
      </PendingButton>
    </form>
  );
}

/**
 * Start / stop the current user's timer for a project (and optionally a bug).
 * Only one timer runs per person; starting here stops any other one.
 */
export function TimerControl({ running, projectId, bugId, title = "Time tracker", admin }: { running: TimeEntry | null; projectId: string; bugId?: string | null; title?: string; admin: boolean }) {
  const here = running && running.projectId === projectId && (running.bugId ?? null) === (bugId ?? null);
  return (
    <div className={`card p-5 ${here ? "border-emerald-400/40 bg-emerald-500/[0.06]" : ""}`}>
      <h2 className="font-display mb-3 flex items-center gap-2 font-semibold">
        <Timer size={18} className="text-gold-400" aria-hidden="true" /> {title}
      </h2>

      {running && here ? (
        <>
          <p className="text-sm text-mist">Running since {clock(running.startedAt)}</p>
          <LiveClock startedAt={running.startedAt.toISOString()} className="my-3 block text-4xl font-bold text-emerald-200" />
          {running.note && <p className="mb-3 text-sm text-mist">“{running.note}”</p>}
          <StopTimerForm entryId={running.id} admin={admin} />
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
          <TimerStartForm projectId={projectId} bugId={bugId} />
        </>
      )}
    </div>
  );
}
