import { IndianRupee, FileText, Wallet } from "lucide-react";
import { listClientFiles, listEntries, listPayments, listProjects, totalMs, requestTime } from "@/lib/portal";
import { requireUser } from "@/lib/auth";
import { addPayment } from "@/lib/portal-actions";
import { amountFor, fmtTotals, sumByCurrency } from "@/lib/portal-config";
import { todayIST } from "@/lib/bill";
import { PageTitle } from "@/components/dash/ui";
import { Stat } from "@/components/dash/portal-ui";
import { DocList, PaymentList } from "@/components/dash/money-ui";
import { PaymentForm } from "@/components/dash/PortalForms";

/** Payments received (admin: from every client; client: their own) plus the client's quotations, invoices and receipts. */
export default async function Payments() {
  const user = await requireUser(["ADMIN", "USER"]);
  const isAdmin = user.role === "ADMIN";
  const scope = isAdmin ? {} : { clientId: user.id };
  const [payments, projects, entries, files] = await Promise.all([
    listPayments(scope),
    listProjects(scope),
    listEntries(scope),
    isAdmin ? Promise.resolve([]) : listClientFiles(user.id),
  ]);
  const now = await requestTime();

  const projectNames = Object.fromEntries(projects.map((p) => [p.id, p.name]));
  const clientOf = Object.fromEntries(projects.map((p) => [p.id, p.clientName]));
  const paid = sumByCurrency(payments);
  // Balance per project (work done − paid), so an advance on one project never hides dues on another.
  const perProject = projects.map((p) => {
    const work = amountFor(totalMs(entries.filter((e) => e.projectId === p.id), now), p.hourlyRate);
    const got = payments.filter((x) => x.projectId === p.id && x.currency === p.currency).reduce((s, x) => s + x.amount, 0);
    return { currency: p.currency, work, balance: Math.round((work - got) * 100) / 100 };
  });
  const work = sumByCurrency(perProject.map((x) => ({ currency: x.currency, amount: x.work })));
  const due = sumByCurrency(perProject.filter((x) => x.balance > 0).map((x) => ({ currency: x.currency, amount: x.balance })));
  const papers = files.filter((f) => f.category !== "DOCUMENT");

  return (
    <>
      <PageTitle title="Payments" sub={isAdmin ? "Money received from clients" : "Payments you have made, and your quotations and invoices"} />

      <div className="mb-10 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat icon={IndianRupee} label={isAdmin ? "Received in total" : "Paid in total"} value={fmtTotals(paid)} sub={`${payments.length} payment${payments.length === 1 ? "" : "s"}`} />
        <Stat icon={Wallet} label="Work done (hours × rate)" value={fmtTotals(work)} />
        <Stat icon={FileText} label="Balance due" value={fmtTotals(due)} sub={due.size ? "Work done − paid" : "Nothing due"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-10">
          <section>
            <h2 className="font-display mb-4 text-lg font-semibold">Payments</h2>
            {isAdmin ? (
              <PaymentList items={payments.map((p) => ({ ...p, projectName: `${clientOf[p.projectId] ?? ""} · ${p.projectName}` }))} showProject canDelete />
            ) : (
              <PaymentList items={payments} showProject={projects.length > 1} />
            )}
          </section>
          {!isAdmin && (
            <section>
              <h2 className="font-display mb-4 text-lg font-semibold">Quotations, invoices &amp; receipts</h2>
              <DocList items={papers} me={user} projectNames={projectNames} empty="Nothing shared yet." />
            </section>
          )}
        </div>
        {isAdmin && (
          <div className="card h-fit p-6">
            <h2 className="font-display mb-1 font-semibold">Record a payment</h2>
            <p className="mb-5 text-sm text-mist">The client sees it on their Payments page and on the project.</p>
            {projects.length ? (
              <PaymentForm
                action={addPayment.bind(null, null)}
                today={todayIST()}
                projects={projects.map((p) => ({ id: p.id, label: `${p.clientName} · ${p.name}` })).sort((a, b) => a.label.localeCompare(b.label))}
              />
            ) : (
              <p className="text-sm text-mist">Create a project for the client first.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
