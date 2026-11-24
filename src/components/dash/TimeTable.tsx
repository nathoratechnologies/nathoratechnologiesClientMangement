import Link from "next/link";
import { Trash2 } from "lucide-react";
import { deleteTimeEntry } from "@/lib/portal-actions";
import { entryMs, type TimeEntry } from "@/lib/portal";
import { amountFor, fmtDuration, fmtMoney } from "@/lib/portal-config";
import { ConfirmButton, LiveClock } from "./Live";

const day = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const time = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function TimeTable({
  entries,
  now,
  money,
  showProject,
  canDelete,
}: {
  entries: TimeEntry[];
  now: number;
  /** Show an amount column at this rate. */
  money?: { rate: number; currency: string };
  showProject?: boolean;
  canDelete?: boolean;
}) {
  if (!entries.length) return <div className="card p-8 text-center text-sm text-mist">No time logged yet.</div>;
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs tracking-wide text-mist uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Who</th>
            <th className="px-4 py-3 font-medium">Work</th>
            <th className="px-4 py-3 text-right font-medium">Time</th>
            {money && <th className="px-4 py-3 text-right font-medium">Amount</th>}
            {canDelete && <th className="px-2 py-3 print:hidden"><span className="sr-only">Delete</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {entries.map((e) => {
            const ms = entryMs(e, now);
            return (
              <tr key={e.id} className={e.endedAt ? "" : "bg-emerald-500/[0.06]"}>
                <td className="px-4 py-3 whitespace-nowrap">
                  {day(e.startedAt)}
                  <span className="block text-xs text-mist">
                    {e.manual ? "added manually" : `${time(e.startedAt)} – ${e.endedAt ? time(e.endedAt) : "now"}`}
                  </span>
                </td>
                <td className="px-4 py-3">{e.userName}</td>
                <td className="px-4 py-3">
                  {showProject && (
                    <Link href={`/dashboard/projects/${e.projectId}`} className="block font-medium hover:underline">{e.projectName}</Link>
                  )}
                  {e.bugId ? (
                    <Link href={`/dashboard/bugs/${e.bugId}`} className="text-gold-300 hover:underline">🐞 {e.bugTitle}</Link>
                  ) : (
                    !showProject && <span className="text-mist">General work</span>
                  )}
                  {e.note && <span className="block text-xs text-mist">{e.note}</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono whitespace-nowrap tabular-nums">
                  {e.endedAt ? fmtDuration(ms) : <LiveClock startedAt={e.startedAt.toISOString()} className="text-emerald-200" />}
                </td>
                {money && <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">{fmtMoney(amountFor(ms, money.rate), money.currency)}</td>}
                {canDelete && (
                  <td className="px-2 py-3 print:hidden">
                    <form action={deleteTimeEntry.bind(null, e.id)}>
                      <ConfirmButton message="Delete this time entry?" className="flex h-9 w-9 items-center justify-center rounded-full text-mist hover:bg-red-500/10 hover:text-red-200">
                        <Trash2 size={15} aria-label="Delete entry" />
                      </ConfirmButton>
                    </form>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
