import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bug, Clock, FolderKanban, Wallet, Phone, Mail } from "lucide-react";
import { getUserById } from "@/lib/db";
import { listBugs, listEntries, listProjects, totalMs, requestTime } from "@/lib/portal";
import { requireUser } from "@/lib/auth";
import { adminResetPassword, adminUpdateClient, createProject } from "@/lib/portal-actions";
import { adminUpdateUser } from "@/lib/actions";
import { OPEN_BUG_STATUSES, amountFor, fmtDuration, fmtMoney } from "@/lib/portal-config";
import { BugList, ProjectList, Stat } from "@/components/dash/portal-ui";
import { ProjectForm, ResetPasswordForm } from "@/components/dash/PortalForms";
import { PendingButton } from "@/components/dash/Live";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser(["ADMIN"]);
  const client = await getUserById(id);
  if (!client || client.role !== "USER") notFound();

  const [projects, bugs, entries] = await Promise.all([listProjects({ clientId: id }), listBugs({ clientId: id }), listEntries({ clientId: id })]);
  const now = await requestTime();
  const openBugs = bugs.filter((b) => OPEN_BUG_STATUSES.includes(b.status));
  const openByProject = Object.fromEntries(projects.map((p) => [p.id, openBugs.filter((b) => b.projectId === p.id).length]));

  // Amount per project at its own rate; totals grouped by currency.
  const byCurrency = new Map<string, number>();
  for (const p of projects) {
    const ms = totalMs(entries.filter((e) => e.projectId === p.id), now);
    byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + amountFor(ms, p.hourlyRate));
  }
  const amountText = [...byCurrency.entries()].map(([c, a]) => fmtMoney(a, c)).join(" + ") || fmtMoney(0);

  return (
    <>
      <Link href="/dashboard/clients" className="mb-6 inline-flex items-center gap-2 text-sm text-mist hover:text-white">
        <ArrowLeft size={16} aria-hidden="true" /> All clients
      </Link>
      <div className="mb-8">
        <p className="text-sm text-mist">Client</p>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{client.company || client.name}</h1>
        <p className="mt-1 text-mist">
          {client.name} · login <span className="font-mono text-white">{client.username || client.email}</span>
          {!client.active && <span className="ml-2 text-red-300">(disabled)</span>}
        </p>
      </div>

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={FolderKanban} label="Projects" value={projects.length} />
        <Stat icon={Bug} label="Open bugs" value={openBugs.length} sub={`${bugs.length} reported in total`} />
        <Stat icon={Clock} label="Hours worked" value={fmtDuration(totalMs(entries, now))} />
        <Stat icon={Wallet} label="Amount" value={amountText} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-10">
          <section>
            <h2 className="font-display mb-4 text-lg font-semibold">Projects</h2>
            <ProjectList items={projects} showClient={false} openBugs={openByProject} />
          </section>
          <section>
            <h2 className="font-display mb-4 text-lg font-semibold">Bugs reported</h2>
            <BugList items={bugs} />
          </section>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display mb-5 font-semibold">Add a project</h2>
            <ProjectForm action={createProject.bind(null, client.id)} submit="Create project" />
          </div>

          <form action={adminUpdateClient.bind(null, client.id)} className="card grid gap-4 p-6">
            <h2 className="font-display font-semibold">Client details</h2>
            <div>
              <label className="label" htmlFor="cd-name">Contact name</label>
              <input id="cd-name" name="name" className="input" defaultValue={client.name} required />
            </div>
            <div>
              <label className="label" htmlFor="cd-company">Company</label>
              <input id="cd-company" name="company" className="input" defaultValue={client.company ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="cd-phone">Phone</label>
              <input id="cd-phone" name="phone" type="tel" className="input" defaultValue={client.phone ?? ""} />
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {client.phone && <a href={`tel:${client.phone}`} className="btn-ghost !min-h-9 !px-3 !py-1.5"><Phone size={14} aria-hidden="true" /> Call</a>}
              {!client.email.endsWith("@client.nathora.local") && (
                <a href={`mailto:${client.email}`} className="btn-ghost !min-h-9 !px-3 !py-1.5"><Mail size={14} aria-hidden="true" /> {client.email}</a>
              )}
            </div>
            <PendingButton className="btn-ghost">Save details</PendingButton>
          </form>

          <div className="card space-y-5 p-6">
            <h2 className="font-display font-semibold">Login</h2>
            <ResetPasswordForm action={adminResetPassword.bind(null, client.id)} />
            <form action={adminUpdateUser.bind(null, client.id)}>
              <input type="hidden" name="active" value={client.active ? "false" : "true"} />
              <button className={`min-h-10 w-full rounded-full border px-4 text-sm ${client.active ? "border-red-400/30 text-red-200 hover:bg-red-500/10" : "border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10"}`}>
                {client.active ? "Disable this login" : "Enable this login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
