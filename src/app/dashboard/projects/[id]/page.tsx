import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2, Sparkles, Wrench, Rocket, StickyNote, TrendingUp, FileText, Download } from "lucide-react";
import { listUsers } from "@/lib/db";
import { getProject, groupHours, listBugs, listEntries, listFiles, listRunning, listUpdates, totalMs, requestTime } from "@/lib/portal";
import { requireUser, ownsProject } from "@/lib/auth";
import { addManualTime, deleteFile, deleteProject, sendDayBill, deleteUpdate, postUpdate, reportBug, updateProject } from "@/lib/portal-actions";
import {
  OPEN_BUG_STATUSES,
  PROJECT_PIPELINE,
  PROJECT_STATUS_LABEL,
  UPDATE_KIND_LABEL,
  amountFor,
  fmtDuration,
  fmtMoney,
} from "@/lib/portal-config";
import { timeAgo } from "@/components/dash/ui";
import { BugList, Pipeline, ProjectStatusBadge, Stat, Tabs, WorkingNow } from "@/components/dash/portal-ui";
import { ManualTimeForm, PostUpdateForm, ProjectForm, ReportBugForm } from "@/components/dash/PortalForms";
import { TimerControl } from "@/components/dash/TimerControl";
import { TimeTable } from "@/components/dash/TimeTable";
import { ConfirmButton, LiveTotal, PrintButton } from "@/components/dash/Live";
import { FileUploader } from "@/components/dash/FileUploader";
import { BillPanel } from "@/components/dash/BillPanel";
import { buildDayBill, todayIST } from "@/lib/bill";
import { whatsAppConfigured } from "@/lib/whatsapp";

const KIND_ICON: Record<string, typeof Sparkles> = { FEATURE: Sparkles, FIX: Wrench, IMPROVEMENT: TrendingUp, DEPLOYMENT: Rocket, NOTE: StickyNote };
const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const monthKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const monthLabel = (k: string) => new Date(`${k}-15T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export default async function ProjectDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; month?: string; day?: string }> }) {
  const [{ id }, { tab: tabParam, month, day }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const project = await getProject(id);
  if (!project) notFound();

  const [bugs, entries, updates, docs] = await Promise.all([listBugs({ projectId: id }), listEntries({ projectId: id }), listUpdates(id), listFiles(id)]);
  const myBugs = bugs.filter((b) => b.assignedToId === user.id);
  const isAdmin = user.role === "ADMIN";
  const isStaff = user.role === "STAFF";
  if (!ownsProject(user, project) && !(isStaff && myBugs.length)) notFound();

  const [running, team] = await Promise.all([
    isAdmin || isStaff ? listRunning(user.id).then((r) => r[0] ?? null) : Promise.resolve(null),
    isAdmin ? listUsers().then((u) => u.filter((x) => x.active && x.role !== "USER")) : Promise.resolve([]),
  ]);

  const now = await requestTime();
  const showMoney = !isStaff; // staff see hours only
  const openBugs = bugs.filter((b) => OPEN_BUG_STATUSES.includes(b.status));
  const bugHours = Object.fromEntries(groupHours(entries.filter((e) => e.bugId), (e) => [e.bugId!, e.bugTitle ?? ""], now).map((r) => [r.key, r.ms]));

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "updates", label: `Updates (${updates.length})` },
    { key: "bugs", label: `Bugs (${openBugs.length} open)` },
    { key: "docs", label: `Documents (${docs.length})` },
    { key: "billing", label: showMoney ? "Hours & billing" : "Hours" },
    ...(isAdmin ? [{ key: "settings", label: "Settings" }] : []),
  ].map((t) => ({ ...t, href: `/dashboard/projects/${id}?tab=${t.key}` }));
  const tab = tabs.some((t) => t.key === tabParam) ? tabParam! : "overview";

  // Billing period filter.
  const months = [...new Set(entries.map((e) => monthKey(e.startedAt)))].sort().reverse();
  const period = month && months.includes(month) ? month : "";
  const billed = period ? entries.filter((e) => monthKey(e.startedAt) === period) : entries;
  const closedMs = totalMs(billed.filter((e) => e.endedAt), now);
  const runningStarts = billed.filter((e) => !e.endedAt).map((e) => e.startedAt.toISOString());
  const people = groupHours(billed, (e) => [e.userId, e.userName], now);
  const allMs = totalMs(entries, now);
  const billDay = day && /^d{4}-d{2}-d{2}$/.test(day) ? day : todayIST();
  const bill = isAdmin && tab === "billing" ? await buildDayBill(project, billDay) : null;

  return (
    <>
      <Link href={isAdmin ? `/dashboard/clients/${project.clientId}` : "/dashboard/projects"} className="mb-6 inline-flex items-center gap-2 text-sm text-mist hover:text-white print:hidden">
        <ArrowLeft size={16} aria-hidden="true" /> {isAdmin ? project.clientName : "Projects"}
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-mist">{project.clientName}</p>
          <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">{project.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ProjectStatusBadge status={project.status} />
            <WorkingNow who={project.workingNow} />
          </div>
        </div>
        {project.liveUrl && (
          <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost print:hidden">
            <ExternalLink size={16} aria-hidden="true" /> Open site
          </a>
        )}
      </div>

      <Tabs tabs={tabs} active={tab} />

      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            <div className="card p-6">
              <h2 className="font-display mb-6 font-semibold">Project status</h2>
              <Pipeline
                steps={PROJECT_PIPELINE}
                labels={PROJECT_STATUS_LABEL}
                current={project.status}
                offLabel={`Currently: ${PROJECT_STATUS_LABEL[project.status] ?? project.status}`}
              />
              {project.description && <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-relaxed whitespace-pre-wrap text-mist">{project.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Open bugs" value={openBugs.length} sub={`${bugs.length - openBugs.length} fixed / closed`} />
              <Stat label="Hours worked" value={<LiveTotal baseMs={totalMs(entries.filter((e) => e.endedAt), now)} running={entries.filter((e) => !e.endedAt).map((e) => e.startedAt.toISOString())} show="duration" serverNow={now} />} />
              {showMoney && (
                <Stat
                  label="Amount so far"
                  value={<LiveTotal baseMs={totalMs(entries.filter((e) => e.endedAt), now)} running={entries.filter((e) => !e.endedAt).map((e) => e.startedAt.toISOString())} show="money" rate={project.hourlyRate} currency={project.currency} serverNow={now} />}
                  sub={project.hourlyRate ? `${fmtMoney(project.hourlyRate, project.currency)} / hour` : "Rate not set yet"}
                />
              )}
            </div>

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Latest updates</h2>
                <Link href={`/dashboard/projects/${id}?tab=updates`} scroll={false} className="text-sm font-semibold text-gold-400 hover:underline">View all</Link>
              </div>
              <UpdateTimeline items={updates.slice(0, 5)} />
            </section>
          </div>

          <div className="space-y-6">
            {(isAdmin || isStaff) && <TimerControl running={running} projectId={id} title="Work on this project" admin={isAdmin} />}
            {(isAdmin || isStaff) && (
              <details className="card p-5" id="add-time">
                <summary className="font-display cursor-pointer font-semibold">Forgot the timer? Add time</summary>
                <p className="mt-2 mb-4 text-sm text-mist">Enter when you started and finished, e.g. 07:30 → 10:15.</p>
                <ManualTimeForm
                  action={addManualTime.bind(null, id)}
                  people={isAdmin ? team.map((t) => ({ id: t.id, name: t.name })) : undefined}
                  bugs={(isStaff ? myBugs : bugs).map((b) => ({ id: b.id, title: b.title }))}
                  meId={user.id}
                />
              </details>
            )}
            {(isStaff ? myBugs : openBugs).length > 0 && (
              <div className="card p-5">
                <h2 className="font-display mb-3 font-semibold">{isStaff ? "Your bugs here" : "Open bugs"}</h2>
                <ul className="space-y-2 text-sm">
                  {(isStaff ? myBugs : openBugs).slice(0, 6).map((b) => (
                    <li key={b.id}>
                      <Link href={`/dashboard/bugs/${b.id}`} className="flex items-center justify-between gap-2 hover:text-gold-300">
                        <span className="truncate">{b.title}</span>
                        <span className="shrink-0 text-xs text-mist">{b.status.toLowerCase()}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {user.role === "USER" && (
              <div className="card p-5">
                <h2 className="font-display mb-1 font-semibold">Found a problem?</h2>
                <p className="mb-4 text-sm text-mist">Tell us and track the fix here.</p>
                <Link href={`/dashboard/projects/${id}?tab=bugs`} scroll={false} className="btn-gold w-full">Report a bug</Link>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "updates" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <UpdateTimeline items={updates} projectId={isAdmin ? id : undefined} />
          {(isAdmin || isStaff) && (
            <div className="card h-fit p-6">
              <h2 className="font-display mb-1 font-semibold">Post an update</h2>
              <p className="mb-5 text-sm text-mist">Tell the client what you built, fixed or deployed.</p>
              <PostUpdateForm action={postUpdate.bind(null, id)} />
            </div>
          )}
        </div>
      )}

      {tab === "bugs" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <BugList items={isStaff ? myBugs : bugs} showProject={false} hours={bugHours} />
          {(user.role === "USER" || isAdmin) && (
            <div className="card h-fit p-6">
              <h2 className="font-display mb-1 font-semibold">Report a bug</h2>
              <p className="mb-5 text-sm text-mist">You will see its status change here as we work on it.</p>
              <ReportBugForm action={reportBug.bind(null, id)} />
            </div>
          )}
        </div>
      )}

      {tab === "docs" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {docs.length ? (
            <ul className="card h-fit divide-y divide-white/5 overflow-hidden">
              {docs.map((f) => (
                <li key={f.id} className="flex items-center gap-3 px-5 py-4">
                  <FileText size={20} className="shrink-0 text-gold-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{f.name}</p>
                    <p className="truncate text-xs text-mist">
                      {fmtSize(f.size)} · {f.uploadedByName}
                      {f.uploaderRole === "USER" ? " (client)" : ""} · {timeAgo(f.createdAt)}
                    </p>
                    {f.note && <p className="mt-1 text-sm text-mist">{f.note}</p>}
                  </div>
                  <a href={`/api/files/${f.id}`} className="btn-ghost !min-h-10 !px-3 !py-2 text-sm" download>
                    <Download size={15} aria-hidden="true" /> <span className="hidden sm:inline">Download</span>
                  </a>
                  {(isAdmin || f.uploadedById === user.id) && (
                    <form action={deleteFile.bind(null, f.id)}>
                      <ConfirmButton message={`Delete ${f.name}?`} className="flex h-10 w-10 items-center justify-center rounded-full text-mist hover:bg-red-500/10 hover:text-red-200">
                        <Trash2 size={15} aria-label="Delete document" />
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="card h-fit p-10 text-center text-mist">No documents yet.</div>
          )}
          <div className="card h-fit p-6">
            <h2 className="font-display mb-1 font-semibold">Upload documents</h2>
            <p className="mb-5 text-sm text-mist">
              {user.role === "USER" ? "Share anything we need for development: requirements, content, logos, credentials sheets, designs." : "Share files with the client (designs, reports, invoices)."}
            </p>
            <FileUploader projectId={id} />
          </div>
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-6">
          {bill && (
            <section id="bill" className="card scroll-mt-24 border-gold-500/30 p-6 print:hidden">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">WhatsApp bill</h2>
                  <p className="text-sm text-mist">
                    {fmtDuration(bill.dayMs)}
                    {project.hourlyRate > 0 ? ` × ${fmtMoney(project.hourlyRate, project.currency)}/h = ${fmtMoney(bill.dayAmount, project.currency)}` : ""} · to {bill.clientName}
                  </p>
                </div>
                <form className="flex items-center gap-2" action={`/dashboard/projects/${id}`}>
                  <input type="hidden" name="tab" value="billing" />
                  <label htmlFor="bill-day" className="text-sm text-mist">Day</label>
                  <input id="bill-day" name="day" type="date" defaultValue={billDay} max={todayIST()} className="input !w-auto !py-2" />
                  <button className="btn-ghost !min-h-10 !px-4 !py-2 text-sm">Show</button>
                </form>
              </div>
              {project.hourlyRate <= 0 && (
                <p className="mb-3 rounded-xl border border-gold-500/30 bg-gold-500/10 p-3 text-sm text-gold-300">
                  The hourly rate isn&apos;t set, so the bill has no amount. <Link href={`/dashboard/projects/${id}?tab=settings`} className="underline">Set the rate in Settings</Link>.
                </p>
              )}
              {!bill.phone && (
                <p className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {bill.clientName} has no WhatsApp number saved, so it can&apos;t open their chat.{" "}
                  <Link href={`/dashboard/clients/${project.clientId}`} className="underline">Add their number</Link>, or copy the text below.
                </p>
              )}
              <BillPanel text={bill.text} waUrl={bill.waUrl} send={whatsAppConfigured() && bill.phone ? sendDayBill.bind(null, id, billDay) : undefined} />
            </section>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex gap-2 overflow-x-auto pb-1 print:hidden" aria-label="Billing period">
              {["", ...months].map((m) => (
                <Link
                  key={m || "all"}
                  scroll={false}
                  href={`/dashboard/projects/${id}?tab=billing${m ? `&month=${m}` : ""}`}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap ${period === m ? "border-gold-500 bg-gold-500/15 text-gold-300" : "border-white/12 text-mist hover:border-white/30"}`}
                >
                  {m ? monthLabel(m) : "All time"}
                </Link>
              ))}
            </nav>
            {showMoney && <PrintButton label="Print / Save as PDF" />}
          </div>

          <div className="card p-6">
            <p className="text-sm text-mist">
              {showMoney ? "Billing report" : "Hours report"} · {project.name} · {project.clientName} · {period ? monthLabel(period) : "All time"}
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-3">
              <div>
                <p className="text-sm text-mist">Total time</p>
                <p className="font-display text-3xl font-bold"><LiveTotal baseMs={closedMs} running={runningStarts} show="duration" serverNow={now} /></p>
                <p className="text-xs text-mist"><LiveTotal baseMs={closedMs} running={runningStarts} show="hours" serverNow={now} /></p>
              </div>
              {showMoney && (
                <>
                  <div>
                    <p className="text-sm text-mist">Rate</p>
                    <p className="font-display text-3xl font-bold">{project.hourlyRate ? fmtMoney(project.hourlyRate, project.currency) : "—"}</p>
                    <p className="text-xs text-mist">per hour</p>
                  </div>
                  <div>
                    <p className="text-sm text-mist">Amount</p>
                    <p className="font-display text-gold-gradient text-3xl font-bold">
                      <LiveTotal baseMs={closedMs} running={runningStarts} show="money" rate={project.hourlyRate} currency={project.currency} serverNow={now} />
                    </p>
                    <p className="text-xs text-mist">hours × rate</p>
                  </div>
                </>
              )}
            </div>
            {runningStarts.length > 0 && <p className="mt-4 text-xs text-emerald-300">A timer is running, so these totals are counting up live.</p>}
          </div>

          {people.length > 0 && (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs tracking-wide text-mist uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Team member</th>
                    <th className="px-4 py-3 text-right font-medium">Entries</th>
                    <th className="px-4 py-3 text-right font-medium">Time</th>
                    {showMoney && <th className="px-4 py-3 text-right font-medium">Amount</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {people.map((p) => (
                    <tr key={p.key}>
                      <td className="px-4 py-3">{p.label}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{p.count}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{fmtDuration(p.ms)}</td>
                      {showMoney && <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(amountFor(p.ms, project.hourlyRate), project.currency)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <TimeTable entries={billed} now={now} money={showMoney ? { rate: project.hourlyRate, currency: project.currency } : undefined} canDelete={isAdmin} />
          {period === "" && allMs > 0 && showMoney && (
            <p className="text-xs text-mist">Amounts use the current project rate. Change it in Settings and every total updates.</p>
          )}
        </div>
      )}

      {tab === "settings" && isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="font-display mb-5 font-semibold">Project details, status &amp; rate</h2>
            <ProjectForm action={updateProject.bind(null, id)} defaults={project} submit="Save project" />
          </div>
          <div className="space-y-6">
            <form action={deleteProject.bind(null, id)}>
              <ConfirmButton
                message={`Delete "${project.name}" with all its bugs, updates and time entries? This cannot be undone.`}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-red-400/30 text-sm text-red-200 hover:bg-red-500/10"
              >
                <Trash2 size={16} aria-hidden="true" /> Delete project
              </ConfirmButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

function UpdateTimeline({ items, projectId }: { items: { id: string; kind: string; title: string; body: string; authorName: string; createdAt: Date }[]; projectId?: string }) {
  if (!items.length) return <div className="card p-8 text-center text-sm text-mist">No updates posted yet.</div>;
  return (
    <ol className="card relative space-y-6 p-6">
      {items.map((u) => {
        const Icon = KIND_ICON[u.kind] ?? StickyNote;
        return (
          <li key={u.id} className="relative flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-300">
              <Icon size={16} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{u.title}</p>
              <p className="text-xs text-mist">
                {UPDATE_KIND_LABEL[u.kind] ?? u.kind} · {u.authorName} · {timeAgo(u.createdAt)}
              </p>
              {u.body && <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-mist">{u.body}</p>}
            </div>
            {projectId && (
              <form action={deleteUpdate.bind(null, projectId, u.id)}>
                <ConfirmButton message="Delete this update?" className="flex h-8 w-8 items-center justify-center rounded-full text-mist hover:bg-red-500/10 hover:text-red-200">
                  <Trash2 size={14} aria-label="Delete update" />
                </ConfirmButton>
              </form>
            )}
          </li>
        );
      })}
    </ol>
  );
}
