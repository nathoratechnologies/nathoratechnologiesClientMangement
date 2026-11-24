import Link from "next/link";
import { Building2 } from "lucide-react";
import { listUsers } from "@/lib/db";
import { listBugs, listEntries, listProjects, totalMs, requestTime } from "@/lib/portal";
import { requireUser } from "@/lib/auth";
import { OPEN_BUG_STATUSES, fmtDuration } from "@/lib/portal-config";
import { PageTitle } from "@/components/dash/ui";
import { Badge, WorkingNow } from "@/components/dash/portal-ui";
import { AddClientForm } from "@/components/dash/PortalForms";

export default async function ClientsPage() {
  await requireUser(["ADMIN"]);
  const [users, projects, bugs, entries] = await Promise.all([listUsers(), listProjects(), listBugs(), listEntries()]);
  const now = await requestTime();
  const clients = users
    .filter((u) => u.role === "USER")
    .map((u) => {
      const mine = projects.filter((p) => p.clientId === u.id);
      return {
        ...u,
        projects: mine,
        openBugs: bugs.filter((b) => b.clientId === u.id && OPEN_BUG_STATUSES.includes(b.status)).length,
        ms: totalMs(entries.filter((e) => e.clientId === u.id), now),
        working: Object.assign({}, ...mine.map((p) => p.workingNow)) as Record<string, string>,
      };
    })
    // Clients with projects first, then newest.
    .sort((a, b) => b.projects.length - a.projects.length || b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <>
      <PageTitle title="Clients" sub="Create a login for each client, then add their projects. Click a client to see everything about them." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {clients.length ? (
          <ul className="card h-fit divide-y divide-white/5 overflow-hidden">
            {clients.map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/clients/${c.id}`} className="flex flex-wrap items-center gap-4 px-5 py-4 transition hover:bg-white/[0.04]">
                  <Building2 size={20} className="shrink-0 text-gold-400" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {c.company || c.name}
                      {c.company && <span className="text-sm font-normal text-mist"> · {c.name}</span>}
                      {!c.active && <span className="ml-1 text-xs font-normal text-red-300">(disabled)</span>}
                    </p>
                    <p className="truncate text-sm text-mist">
                      {c.username ? `@${c.username}` : c.email} · {c.projects.length} project{c.projects.length === 1 ? "" : "s"} · {fmtDuration(c.ms)} logged
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <WorkingNow who={c.working} compact />
                    {c.openBugs > 0 && <Badge tone="red">{c.openBugs} open bug{c.openBugs === 1 ? "" : "s"}</Badge>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-10 text-center text-mist">No clients yet. Create the first login on the right.</div>
        )}
        <div className="card h-fit p-6">
          <h2 className="font-display mb-1 font-semibold">New client login</h2>
          <p className="mb-5 text-sm text-mist">The client signs in at /login with this username and password.</p>
          <AddClientForm />
        </div>
      </div>
    </>
  );
}
