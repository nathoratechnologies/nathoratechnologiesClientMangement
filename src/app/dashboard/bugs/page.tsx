import Link from "next/link";
import { Search } from "lucide-react";
import { groupHours, listBugs, listEntries } from "@/lib/portal";
import { requireUser } from "@/lib/auth";
import { BUG_STATUSES, BUG_STATUS_LABEL, OPEN_BUG_STATUSES } from "@/lib/portal-config";
import { PageTitle } from "@/components/dash/ui";
import { BugList } from "@/components/dash/portal-ui";

export default async function BugsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requireUser();
  const { status, q } = await searchParams;
  const scope = user.role === "ADMIN" ? {} : user.role === "STAFF" ? { assignedToId: user.id } : { clientId: user.id };
  const [all, entries] = await Promise.all([listBugs(scope), listEntries(user.role === "USER" ? { clientId: user.id } : user.role === "STAFF" ? { userId: user.id } : {})]);
  const needle = (q ?? "").toLowerCase();

  const items = all
    .filter((b) => (status === "OPEN" ? OPEN_BUG_STATUSES.includes(b.status) : !status || b.status === status))
    .filter((b) => !needle || [b.title, b.description, b.projectName, b.assignedToName ?? ""].some((v) => v.toLowerCase().includes(needle)));
  const hours = Object.fromEntries(groupHours(entries.filter((e) => e.bugId), (e) => [e.bugId!, ""]).map((r) => [r.key, r.ms]));
  const count = (s?: string) => (s === "OPEN" ? all.filter((b) => OPEN_BUG_STATUSES.includes(b.status)).length : s ? all.filter((b) => b.status === s).length : all.length);
  const link = (s?: string) => `/dashboard/bugs?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageTitle
        title={user.role === "STAFF" ? "Bugs assigned to me" : user.role === "USER" ? "My bug reports" : "All bugs"}
        sub={user.role === "USER" ? "Report bugs from a project page; follow their progress here." : `${count("OPEN")} open`}
      />
      <div className="mb-6 space-y-4">
        <form className="relative">
          <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-mist" aria-hidden="true" />
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="q" className="sr-only">Search bugs</label>
          <input id="q" name="q" defaultValue={q} placeholder="Search title, project, staff…" className="input !pl-11" />
        </form>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[undefined, "OPEN", ...BUG_STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={link(s)}
              className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                status === s || (!status && !s) ? "border-gold-500 bg-gold-500/15 text-gold-300" : "border-white/12 text-mist hover:border-white/30"
              }`}
            >
              {s === "OPEN" ? "Open" : s ? BUG_STATUS_LABEL[s] : "All"} <span className="text-xs opacity-70">{count(s)}</span>
            </Link>
          ))}
        </div>
      </div>
      <BugList items={items} hours={hours} />
    </>
  );
}
