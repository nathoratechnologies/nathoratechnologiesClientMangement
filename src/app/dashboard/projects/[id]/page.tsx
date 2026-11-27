import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2, Sparkles, Wrench, Rocket, StickyNote, TrendingUp } from "lucide-react";
import { listUsers } from "@/lib/db";
import { getProject, groupHours, listBugs, listEntries, listFiles, listPayments, listRunning, listUpdates, totalMs, requestTime } from "@/lib/portal";
import { requireUser, ownsProject } from "@/lib/auth";
import { addManualTime, addPayment, deleteProject, sendDayBill, updateRate, deleteUpdate, postUpdate, reportBug, updateProject } from "@/lib/portal-actions";
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
import { BugList, Pipeline, ProjectStatusBadge, Stat, Tabs, WorkStatus, WorkingNow } from "@/components/dash/portal-ui";
import { ManualTimeForm, PaymentForm, PostUpdateForm, ProjectForm, RateForm, ReportBugForm } from "@/components/dash/PortalForms";
import { DocList, PaymentList } from "@/components/dash/money-ui";
import { TimerControl } from "@/components/dash/TimerControl";
import { TimeTable } from "@/components/dash/TimeTable";
import { ConfirmButton, LiveTotal, PrintButton } from "@/components/dash/Live";
import { FileUploader } from "@/components/dash/FileUploader";
import { BillPanel } from "@/components/dash/BillPanel";
import { buildDayBill, todayIST } from "@/lib/bill";
import { whatsAppConfigured } from "@/lib/whatsapp";

const KIND_ICON: Record<string, typeof Sparkles> = { FEATURE: Sparkles, FIX: Wrench, IMPROVEMENT: TrendingUp, DEPLOYMENT: Rocket, NOTE: StickyNote };
const monthKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).slice(0, 7);
const monthLabel = (k: string) => new Date(`${k}-15T00:00:00Z`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

export default async function ProjectDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; month?: string; day?: string }> }) {
  const [{ id }, { tab: tabParam, month, day }] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const project = await getProject(id);
  if (!project) notFound();

  const [bugs, entries, updates, docs, payments] = await Promise.all([
    listBugs({ projectId: id }),
    listEntries({ projectId: id }),
    listUpdates(id),
    listFiles(id),
    listPayments({ projectId: id }),
  ]);
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
    ...(showMoney ? [{ key: "payments", label: `Payments (${payments.length})` }] : []),
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
  const billDay = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : todayIST();
  const bill = isAdmin && tab === "billing" ? await buildDayBill(project, billDay) : null;

  // Payments: what has been paid against the work done so far (hours × rate).
  const paid = payments.filter((p) => p.currency === project.currency).reduce((s, p) => s + p.amount, 0);
  const workAmount = amountFor(allMs, project.hourlyRate);
  const balance = Math.round((workAmount - paid) * 100) / 100;
  // Quotations first, then invoices and receipts, then everything else.
  const CATEGORY_ORDER = ["QUOTATION", "INVOICE", "RECEIPT", "DOCUMENT"];
  const sortedDocs = [...docs].sort((a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category));
  const quotations = docs.filter((d) => d.category === "QUOTATION");

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
                  sub={project.hourlyRate ? `${fmtMoney(project.hourlyRate, project.currency)} / hour` : isAdmin ? <Link href={`/dashboard/projects/${id}?tab=billing`} className="text-gold-300 underline">Set the rate per hour</Link> : "Rate not set yet"}
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
            {user.role === "USER" && <WorkStatus entries={entries} now={now} />}
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
          <DocList items={sortedDocs} me={user} />
          <div className="card h-fit p-6">
            <h2 className="font-display mb-1 font-semibold">Upload documents</h2>
            <p className="mb-5 text-sm text-mist">
              {user.role === "USER"
                ? "Share anything we need for development: requirements, content, logos, credentials sheets, designs."
                : isAdmin
                  ? "Share files with the client. Choose Quotation, Invoice or Receipt so the client finds them under Payments too."
                  : "Share files with the client (designs, reports)."}
            </p>
            <FileUploader projectId={id} pickCategory={isAdmin} />
          </div>
        </div>
      )}

      {tab === "payments" && showMoney && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Stat label="Paid so far" value={<span className="text-emerald-300">{fmtMoney(paid, project.currency)}</span>} sub={`${payments.length} payment${payments.length === 1 ? "" : "s"}`} />
              <Stat label="Work done" value={project.hourlyRate ? fmtMoney(workAmount, project.currency) : "—"} sub={`${fmtDuration(allMs)} × ${project.hourlyRate ? fmtMoney(project.hourlyRate, project.currency) : "rate not set"}`} />
              {project.hourlyRate > 0 && (
                <Stat
                  label={balance > 0 ? "Balance due" : balance < 0 ? "Paid in advance" : "Balance"}
                  value={<span className={balance > 0 ? "text-gold-300" : "text-emerald-300"}>{fmtMoney(Math.abs(balance), project.currency)}</span>}
                  sub={balance < 0 ? "Will be adjusted against upcoming work" : "Work done − paid"}
                />
              )}
            </div>
            <section>
              <h2 className="font-display mb-4 text-lg font-semibold">Payments received</h2>
              <PaymentList items={payments} canDelete={isAdmin} />
            </section>
            <section>
              <h2 className="font-display mb-4 text-lg font-semibold">Quotations</h2>
              <DocList items={quotations} me={user} empty={isAdmin ? "No quotation uploaded. Use the form on the right, or Documents › Type: Quotation." : "No quotations shared yet."} />
            </section>
          </div>
          {isAdmin && (
            <div className="space-y-6">
              <div className="card h-fit p-6">
                <h2 className="font-display mb-1 font-semibold">Record a payment</h2>
                <p className="mb-5 text-sm text-mist">Money received from {project.clientName}. They see it here right away.</p>
                <PaymentForm action={addPayment.bind(null, id)} today={todayIST()} />
              </div>
              <div className="card h-fit p-6">
                <h2 className="font-display mb-1 font-semibold">Upload a quotation</h2>
                <p className="mb-5 text-sm text-mist">PDF quotations open right in the client&apos;s browser.</p>
                <FileUploader projectId={id} pickCategory defaultCategory="QUOTATION" />
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-6">
          {isAdmin && (
            <div className={`card p-5 print:hidden ${project.hourlyRate > 0 ? "" : "border-gold-500/40"}`}>
              <RateForm action={updateRate.bind(null, id)} rate={project.hourlyRate} currency={project.currency} />
            </div>
          )}
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
                  The hourly rate isn&apos;t set, so the bill has no amount. Enter it in the “Rate per hour” box at the top of this page.
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
