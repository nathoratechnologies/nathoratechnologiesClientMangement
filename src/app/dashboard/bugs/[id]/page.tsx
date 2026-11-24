import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, Send } from "lucide-react";
import { listUsers } from "@/lib/db";
import { getBug, getProject, listBugNotes, listEntries, listRunning, totalMs, groupHours, requestTime } from "@/lib/portal";
import { requireUser, canAccessBug } from "@/lib/auth";
import { addBugComment, addManualTime, deleteBug, updateBug } from "@/lib/portal-actions";
import { BUG_PIPELINE, BUG_STATUSES, BUG_STATUS_LABEL, PRIORITIES, fmtDuration, fmtMoney } from "@/lib/portal-config";
import { ref, timeAgo } from "@/components/dash/ui";
import { BugStatusBadge, Pipeline, PriorityBadge, WorkStatus, WorkingNow } from "@/components/dash/portal-ui";
import { TimerControl } from "@/components/dash/TimerControl";
import { ManualTimeForm } from "@/components/dash/PortalForms";
import { TimeTable } from "@/components/dash/TimeTable";
import { ConfirmButton, LiveTotal, PendingButton } from "@/components/dash/Live";

export default async function BugDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const bug = await getBug(id);
  if (!bug || !canAccessBug(user, bug)) notFound();

  const isAdmin = user.role === "ADMIN";
  const team = user.role !== "USER";
  const [project, notes, entries, running, staff] = await Promise.all([
    getProject(bug.projectId),
    listBugNotes(id),
    listEntries({ bugId: id }),
    team ? listRunning(user.id).then((r) => r[0] ?? null) : Promise.resolve(null),
    isAdmin ? listUsers().then((u) => u.filter((x) => x.active && x.role !== "USER")) : Promise.resolve([]),
  ]);
  const now = await requestTime();
  const closedMs = totalMs(entries.filter((e) => e.endedAt), now);
  const runningStarts = entries.filter((e) => !e.endedAt).map((e) => e.startedAt.toISOString());
  const showMoney = user.role !== "STAFF" && project && project.hourlyRate > 0;
  const people = groupHours(entries, (e) => [e.userId, e.userName], now);
  const canTime = team && (isAdmin || bug.assignedToId === user.id) && bug.status !== "CLOSED";

  return (
    <>
      <Link href={`/dashboard/projects/${bug.projectId}?tab=bugs`} className="mb-6 inline-flex items-center gap-2 text-sm text-mist hover:text-white">
        <ArrowLeft size={16} aria-hidden="true" /> {bug.projectName}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-mist">Bug {ref(bug.id)} · reported by {bug.reportedByName} · {timeAgo(bug.createdAt)}</p>
          <h1 className="font-display mt-1 text-2xl font-bold break-words sm:text-3xl">{bug.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BugStatusBadge status={bug.status} />
            <PriorityBadge priority={bug.priority} />
            <WorkingNow who={bug.workingNow} />
          </div>
        </div>
      </div>

      <div className="card mb-6 p-6">
        <Pipeline steps={BUG_PIPELINE} labels={BUG_STATUS_LABEL} current={bug.status} offLabel="This bug was closed without a fix." />
        <p className="mt-5 text-center text-sm text-mist">
          {bug.assignedToName ? (
            <>Assigned to <span className="font-semibold text-white">{bug.assignedToName}</span></>
          ) : (
            "Waiting to be assigned to a developer"
          )}
          {" · "}time spent <span className="font-semibold text-white"><LiveTotal baseMs={closedMs} running={runningStarts} show="duration" serverNow={now} /></span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="order-2 space-y-6 lg:order-1">
          <div className="card p-6">
            <h2 className="font-display mb-3 font-semibold">Description</h2>
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-mist">{bug.description}</p>
          </div>

          <div className="card p-6">
            <h2 className="font-display mb-4 font-semibold">Activity</h2>
            <ol className="space-y-4">
              {notes.map((n) =>
                n.system ? (
                  <li key={n.id} className="flex gap-3 text-xs text-mist">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />
                    <span>
                      {n.body} · {timeAgo(n.createdAt)}
                    </span>
                  </li>
                ) : (
                  <li key={n.id} className={`rounded-2xl border p-4 ${n.authorRole === "USER" ? "border-white/10 bg-white/[0.03]" : "border-gold-500/20 bg-gold-500/[0.05]"}`}>
                    <p className="mb-1 text-xs text-mist">
                      <span className="font-semibold text-white">{n.authorName}</span>
                      {n.authorRole !== "USER" && " · Nathora team"} · {timeAgo(n.createdAt)}
                    </p>
                    <p className="text-sm break-words whitespace-pre-wrap">{n.body}</p>
                  </li>
                ),
              )}
            </ol>
            <form action={addBugComment.bind(null, id)} className="mt-5 flex gap-2 border-t border-white/10 pt-5">
              <label htmlFor="comment" className="sr-only">Add a comment</label>
              <textarea id="comment" name="body" rows={2} required className="input resize-none" placeholder={team ? "Reply to the client…" : "Add more details or a question…"} />
              <PendingButton pendingText="" className="btn-gold !h-auto !px-4">
                <Send size={16} aria-label="Send" />
              </PendingButton>
            </form>
          </div>

          {team && entries.length > 0 && (
            <section>
              <h2 className="font-display mb-4 font-semibold">Time entries</h2>
              <TimeTable entries={entries} now={now} canDelete={isAdmin} money={isAdmin && project ? { rate: project.hourlyRate, currency: project.currency } : undefined} />
            </section>
          )}
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          {user.role === "USER" && <WorkStatus entries={entries} now={now} />}
          {canTime && <TimerControl running={running} projectId={bug.projectId} bugId={bug.id} title="Work on this bug" admin={isAdmin} />}
          {canTime && (
            <details className="card p-5">
              <summary className="font-display cursor-pointer font-semibold">Forgot the timer? Add time</summary>
              <p className="mt-2 mb-4 text-sm text-mist">Enter when you started and finished, e.g. 07:30 → 10:15.</p>
              <ManualTimeForm
                action={addManualTime.bind(null, bug.projectId)}
                people={isAdmin ? staff.map((s) => ({ id: s.id, name: s.name })) : undefined}
                bugs={[]}
                defaultBugId={bug.id}
                meId={user.id}
              />
            </details>
          )}

          {team && (
            <form action={updateBug.bind(null, id)} className="card space-y-4 p-5">
              <h2 className="font-display font-semibold">Manage</h2>
              <div>
                <label className="label" htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={bug.status} className="input">
                  {BUG_STATUSES.map((s) => <option key={s} value={s}>{BUG_STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              {isAdmin && (
                <>
                  <div>
                    <label className="label" htmlFor="assignedToId">Assign to staff</label>
                    <select id="assignedToId" name="assignedToId" defaultValue={bug.assignedToId ?? ""} className="input">
                      <option value="">Not assigned</option>
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role.toLowerCase()})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="priority">Priority</label>
                    <select id="priority" name="priority" defaultValue={bug.priority} className="input">
                      {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>)}
                    </select>
                  </div>
                </>
              )}
              <PendingButton className="btn-gold w-full">Save changes</PendingButton>
            </form>
          )}

          <div className="card p-5">
            <h2 className="font-display mb-3 font-semibold">Time on this bug</h2>
            <p className="font-display text-3xl font-bold"><LiveTotal baseMs={closedMs} running={runningStarts} show="duration" serverNow={now} /></p>
            {showMoney && (
              <p className="mt-1 text-sm text-mist">
                <LiveTotal baseMs={closedMs} running={runningStarts} show="money" rate={project.hourlyRate} currency={project.currency} serverNow={now} /> at {fmtMoney(project.hourlyRate, project.currency)}/h
              </p>
            )}
            {people.length > 0 && (
              <ul className="mt-4 space-y-1 border-t border-white/10 pt-3 text-sm">
                {people.map((p) => (
                  <li key={p.key} className="flex justify-between gap-2">
                    <span className="text-mist">{p.label}</span>
                    <span className="tabular-nums">{fmtDuration(p.ms)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isAdmin && (
            <form action={deleteBug.bind(null, id)}>
              <ConfirmButton message="Delete this bug? Logged hours stay on the project." className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-red-400/30 text-sm text-red-200 hover:bg-red-500/10">
                <Trash2 size={16} aria-hidden="true" /> Delete bug
              </ConfirmButton>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
