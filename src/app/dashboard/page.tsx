import Link from "next/link";
import { Inbox, Bug, Clock, Building2, FolderKanban, Timer, PlusCircle } from "lucide-react";
import { listEnquiries, listUsers } from "@/lib/db";
import { listBugs, listEntries, listProjects, listRunning, totalMs, requestTime } from "@/lib/portal";
import { requireUser } from "@/lib/auth";
import { OPEN_BUG_STATUSES, fmtDuration } from "@/lib/portal-config";
import { EnquiryList, PageTitle } from "@/components/dash/ui";
import { BugList, ProjectList, Stat } from "@/components/dash/portal-ui";
import { LiveClock } from "@/components/dash/Live";
import { scopeFor } from "./scope";

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {href && <Link href={href} className="text-sm font-semibold text-gold-400 hover:underline">View all</Link>}
      </div>
      {children}
    </section>
  );
}

export default async function Overview() {
  const user = await requireUser();
  const role = user.role;
  const [enquiries, projects, bugs, entries, running, users] = await Promise.all([
    listEnquiries(scopeFor(user)),
    role === "STAFF" ? Promise.resolve([]) : listProjects(role === "USER" ? { clientId: user.id } : {}),
    listBugs(role === "ADMIN" ? {} : role === "STAFF" ? { assignedToId: user.id } : { clientId: user.id }),
    role === "ADMIN" ? Promise.resolve([]) : listEntries(role === "STAFF" ? { userId: user.id } : { clientId: user.id }),
    role === "USER" ? Promise.resolve([]) : listRunning(role === "STAFF" ? user.id : undefined),
    role === "ADMIN" ? listUsers() : Promise.resolve([]),
  ]);
  const now = await requestTime();
  const openBugs = bugs.filter((b) => OPEN_BUG_STATUSES.includes(b.status));
  const openByProject = Object.fromEntries(projects.map((p) => [p.id, openBugs.filter((b) => b.projectId === p.id).length]));
  const newEnquiries = enquiries.filter((e) => e.status === "NEW").length;
  const recentEnquiries = [...enquiries].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 5);
  const mineRunning = running.find((r) => r.userId === user.id);
  const first = user.name.split(" ")[0];

  if (role === "USER") {
    return (
      <>
        <PageTitle title={`Hello, ${first}`} sub="Your projects, bug reports and hours in one place" />
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat icon={FolderKanban} label="Projects" value={projects.length} />
          <Stat icon={Bug} label="Open bugs" value={openBugs.length} />
          <Stat icon={Clock} label="Hours worked for you" value={fmtDuration(totalMs(entries, now))} />
          <Stat icon={Inbox} label="Enquiries" value={enquiries.length} />
        </div>
        <Section title="My projects" href="/dashboard/projects">
          <ProjectList items={projects} showClient={false} openBugs={openByProject} />
        </Section>
        {bugs.length > 0 && (
          <Section title="My bug reports" href="/dashboard/bugs">
            <BugList items={bugs.slice(0, 5)} />
          </Section>
        )}
        <Section title="Enquiries" href="/dashboard/enquiries">
          {enquiries.length ? (
            <EnquiryList items={recentEnquiries} showContact={false} />
          ) : (
            <Link href="/dashboard/enquiries/new" className="btn-ghost"><PlusCircle size={16} aria-hidden="true" /> Send a new enquiry</Link>
          )}
        </Section>
      </>
    );
  }

  if (role === "STAFF") {
    const day = new Date(`${new Date(now).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}T00:00:00+05:30`).getTime();
    const todayMs = entries.reduce((s, e) => s + Math.max(0, (e.endedAt?.getTime() ?? now) - Math.max(day, e.startedAt.getTime())), 0);
    return (
      <>
        <PageTitle title={`Hello, ${first}`} sub="Bugs assigned to you and your hours" />
        <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat icon={Bug} label="Open bugs for you" value={openBugs.length} />
          <Stat icon={Timer} label="Worked today" value={fmtDuration(todayMs)} />
          <Stat icon={Clock} label="All time" value={fmtDuration(totalMs(entries, now))} />
          <Stat icon={Inbox} label="Enquiries assigned" value={enquiries.length} />
        </div>
        {mineRunning && <RunningBanner e={mineRunning} />}
        <Section title="My open bugs" href="/dashboard/bugs">
          <BugList items={openBugs} />
        </Section>
        <Section title="Enquiries" href="/dashboard/enquiries">
          <EnquiryList items={recentEnquiries} showContact />
        </Section>
      </>
    );
  }

  const clients = users.filter((u) => u.role === "USER");
  return (
    <>
      <PageTitle
        title={`Hello, ${first}`}
        sub={`${openBugs.filter((b) => b.status === "REPORTED").length} new bug reports · ${newEnquiries} new enquiries`}
        action={<Link href="/dashboard/clients" className="btn-gold"><PlusCircle size={18} aria-hidden="true" /> New client</Link>}
      />
      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Building2} label="Clients" value={clients.length} sub={`${projects.length} projects`} />
        <Stat icon={Bug} label="Open bugs" value={openBugs.length} sub={`${openBugs.filter((b) => !b.assignedToId).length} not assigned`} />
        <Stat icon={Timer} label="Working now" value={running.length} />
        <Stat icon={Inbox} label="New enquiries" value={newEnquiries} />
      </div>
      {mineRunning && <RunningBanner e={mineRunning} />}
      {running.length > 0 && (
        <Section title="Working right now" href="/dashboard/time">
          <ul className="card divide-y divide-white/5 overflow-hidden">
            {running.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="font-semibold">{r.userName}</span>
                <span className="min-w-0 flex-1 truncate text-mist">{r.bugTitle ?? r.projectName}</span>
                <LiveClock startedAt={r.startedAt.toISOString()} className="text-emerald-200" />
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section title="Open bugs" href="/dashboard/bugs?status=OPEN">
        <BugList items={openBugs.slice(0, 6)} />
      </Section>
      <Section title="Recent enquiries" href="/dashboard/enquiries">
        <EnquiryList items={recentEnquiries} showContact />
      </Section>
    </>
  );
}

function RunningBanner({ e }: { e: { id: string; bugId: string | null; bugTitle: string | null; projectId: string; projectName: string; startedAt: Date } }) {
  return (
    <Link
      href={e.bugId ? `/dashboard/bugs/${e.bugId}` : `/dashboard/projects/${e.projectId}`}
      className="card mb-10 flex items-center gap-4 border-emerald-400/40 bg-emerald-500/[0.06] p-5 hover:bg-emerald-500/10"
    >
      <span className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-mist">Your timer is running</span>
        <span className="block truncate font-semibold">{e.bugTitle ? `${e.bugTitle} · ${e.projectName}` : e.projectName}</span>
      </span>
      <LiveClock startedAt={e.startedAt.toISOString()} className="text-2xl font-bold text-emerald-200" />
    </Link>
  );
}
