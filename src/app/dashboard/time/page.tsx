import Link from "next/link";
import { Play, Square } from "lucide-react";
import { entryMs, groupHours, listBugs, listEntries, listRunning, type TimeEntry, requestTime } from "@/lib/portal";
import { requireUser } from "@/lib/auth";
import { startTimer, stopTimer } from "@/lib/portal-actions";
import { OPEN_BUG_STATUSES, fmtDuration } from "@/lib/portal-config";
import { PageTitle } from "@/components/dash/ui";
import { BugStatusBadge } from "@/components/dash/portal-ui";
import { TimeTable } from "@/components/dash/TimeTable";
import { LiveClock, LiveTotal, PendingButton } from "@/components/dash/Live";

/** Start of today / this week (Mon) / this month, in India time. */
function periodStarts(now: number) {
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const day = new Date(`${today}T00:00:00+05:30`).getTime();
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7; // Mon = 0
  return {
    day,
    week: day - weekday * 86_400_000,
    month: new Date(`${today.slice(0, 7)}-01T00:00:00+05:30`).getTime(),
  };
}

/** Time inside [from, now], clipping entries that started earlier. */
function msSince(list: TimeEntry[], from: number, now: number) {
  return list.reduce((s, e) => {
    const end = e.endedAt ? e.endedAt.getTime() : now;
    return s + Math.max(0, end - Math.max(from, e.startedAt.getTime()));
  }, 0);
}

export default async function TimePage() {
  const user = await requireUser(["ADMIN", "STAFF"]);
  const isAdmin = user.role === "ADMIN";
  const [entries, running, myBugs] = await Promise.all([
    listEntries(isAdmin ? {} : { userId: user.id }),
    listRunning(isAdmin ? undefined : user.id),
    isAdmin ? Promise.resolve([]) : listBugs({ assignedToId: user.id }),
  ]);
  const now = await requestTime();
  const p = periodStarts(now);
  const mine = entries.filter((e) => e.userId === user.id);
  const myRunning = running.find((r) => r.userId === user.id) ?? null;

  const summary = [
    { label: "Today", ms: msSince(mine, p.day, now) },
    { label: "This week", ms: msSince(mine, p.week, now) },
    { label: "This month", ms: msSince(mine, p.month, now) },
    { label: "All time", ms: mine.reduce((s, e) => s + entryMs(e, now), 0) },
  ];

  const staffRows = isAdmin
    ? groupHours(entries, (e) => [e.userId, e.userName], now).map((r) => {
        const list = entries.filter((e) => e.userId === r.key);
        return { ...r, today: msSince(list, p.day, now), week: msSince(list, p.week, now), month: msSince(list, p.month, now) };
      })
    : [];
  const projectRows = groupHours(isAdmin ? entries : mine, (e) => [e.projectId, e.projectName], now);
  const openBugs = myBugs.filter((b) => OPEN_BUG_STATUSES.includes(b.status));

  return (
    <>
      <PageTitle title={isAdmin ? "Time tracking" : "My time"} sub={isAdmin ? "Who is working now, and hours per staff member and project" : "Start a timer on a bug assigned to you; your hours add up here"} />

      {/* Your own running timer */}
      {myRunning && (
        <div className="card mb-6 flex flex-wrap items-center gap-4 border-emerald-400/40 bg-emerald-500/[0.06] p-5">
          <span className="relative flex h-3 w-3" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-mist">You are working on</p>
            <Link href={myRunning.bugId ? `/dashboard/bugs/${myRunning.bugId}` : `/dashboard/projects/${myRunning.projectId}`} className="font-semibold hover:underline">
              {myRunning.bugTitle ? `${myRunning.bugTitle} · ` : ""}
              {myRunning.projectName}
            </Link>
          </div>
          <LiveClock startedAt={myRunning.startedAt.toISOString()} className="text-3xl font-bold text-emerald-200" />
          <form action={stopTimer.bind(null, myRunning.id)}>
            <PendingButton pendingText="Stopping…" className="flex min-h-11 items-center gap-2 rounded-full bg-red-500/90 px-5 font-semibold text-white hover:bg-red-500">
              <Square size={14} fill="currentColor" aria-hidden="true" /> Stop
            </PendingButton>
          </form>
        </div>
      )}

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="font-display text-2xl font-bold sm:text-3xl">
              <LiveTotal baseMs={s.ms} running={[]} show="duration" serverNow={now} />
            </p>
            <p className="text-sm text-mist">{isAdmin ? `You · ${s.label.toLowerCase()}` : s.label}</p>
          </div>
        ))}
      </div>

      {!isAdmin && (
        <section className="mb-10">
          <h2 className="font-display mb-4 text-lg font-semibold">My open bugs</h2>
          {openBugs.length ? (
            <ul className="card divide-y divide-white/5 overflow-hidden">
              {openBugs.map((b) => {
                const active = myRunning?.bugId === b.id;
                return (
                  <li key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <Link href={`/dashboard/bugs/${b.id}`} className="min-w-0 flex-1 hover:underline">
                      <p className="truncate font-semibold">{b.title}</p>
                      <p className="truncate text-sm text-mist">{b.projectName}</p>
                    </Link>
                    <BugStatusBadge status={b.status} />
                    {active ? (
                      <form action={stopTimer.bind(null, myRunning!.id)}>
                        <PendingButton pendingText="…" className="flex min-h-10 items-center gap-2 rounded-full bg-red-500/90 px-4 text-sm font-semibold text-white">
                          <Square size={12} fill="currentColor" aria-hidden="true" /> Stop
                        </PendingButton>
                      </form>
                    ) : (
                      <form action={startTimer}>
                        <input type="hidden" name="bugId" value={b.id} />
                        <PendingButton pendingText="…" className="btn-gold !min-h-10 !px-4 !py-2 text-sm">
                          <Play size={12} fill="currentColor" aria-hidden="true" /> Start
                        </PendingButton>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="card p-8 text-center text-sm text-mist">No open bugs assigned to you.</div>
          )}
        </section>
      )}

      {isAdmin && (
        <section className="mb-10">
          <h2 className="font-display mb-4 text-lg font-semibold">Working right now</h2>
          {running.length ? (
            <ul className="card divide-y divide-white/5 overflow-hidden">
              {running.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.userName}</p>
                    <Link href={r.bugId ? `/dashboard/bugs/${r.bugId}` : `/dashboard/projects/${r.projectId}`} className="truncate text-sm text-mist hover:underline">
                      {r.bugTitle ? `${r.bugTitle} · ` : ""}
                      {r.projectName}
                    </Link>
                  </div>
                  <LiveClock startedAt={r.startedAt.toISOString()} className="text-lg text-emerald-200" />
                  <form action={stopTimer.bind(null, r.id)}>
                    <PendingButton pendingText="…" className="min-h-10 rounded-full border border-red-400/30 px-4 text-sm text-red-200 hover:bg-red-500/10">
                      Stop
                    </PendingButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <div className="card p-8 text-center text-sm text-mist">Nobody has a timer running.</div>
          )}
        </section>
      )}

      {isAdmin && staffRows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display mb-4 text-lg font-semibold">Hours per staff member</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-white/10 text-xs tracking-wide text-mist uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 text-right font-medium">Today</th>
                  <th className="px-4 py-3 text-right font-medium">This week</th>
                  <th className="px-4 py-3 text-right font-medium">This month</th>
                  <th className="px-4 py-3 text-right font-medium">All time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 tabular-nums">
                {staffRows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-4 py-3">{r.label}</td>
                    <td className="px-4 py-3 text-right">{fmtDuration(r.today)}</td>
                    <td className="px-4 py-3 text-right">{fmtDuration(r.week)}</td>
                    <td className="px-4 py-3 text-right">{fmtDuration(r.month)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtDuration(r.ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {projectRows.length > 0 && (
        <section className="mb-10">
          <h2 className="font-display mb-4 text-lg font-semibold">Hours per project</h2>
          <ul className="card divide-y divide-white/5 overflow-hidden">
            {projectRows.map((r) => (
              <li key={r.key}>
                <Link href={`/dashboard/projects/${r.key}?tab=billing`} className="flex items-center justify-between gap-4 px-5 py-3 text-sm hover:bg-white/[0.04]">
                  <span className="truncate">{r.label}</span>
                  <span className="tabular-nums">{fmtDuration(r.ms)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">{isAdmin ? "Recent entries (everyone)" : "My entries"}</h2>
        <TimeTable entries={entries.slice(0, 100)} now={now} showProject canDelete={isAdmin} />
      </section>
    </>
  );
}
