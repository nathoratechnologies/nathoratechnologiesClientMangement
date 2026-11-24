import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";
import { listEnquiries } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { STATUSES, STATUS_LABEL } from "@/lib/site";
import { EnquiryList, PageTitle } from "@/components/dash/ui";
import { scopeFor } from "../scope";

export default async function Enquiries({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requireUser();
  const { status, q } = await searchParams;
  const needle = (q ?? "").toLowerCase();
  const items = (await listEnquiries(scopeFor(user)))
    .filter((e) => !status || e.status === status)
    .filter((e) => !needle || [e.name, e.email, e.phone, e.service, e.message].some((v) => v.toLowerCase().includes(needle)))
    .slice(0, 200);
  const isTeam = user.role !== "USER";
  const link = (s?: string) => `/dashboard/enquiries?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <PageTitle
        title={user.role === "ADMIN" ? "All enquiries" : user.role === "STAFF" ? "Assigned to me" : "My enquiries"}
        action={
          !isTeam ? (
            <Link href="/dashboard/enquiries/new" className="btn-gold">
              <PlusCircle size={18} aria-hidden="true" /> New enquiry
            </Link>
          ) : undefined
        }
      />
      {isTeam && (
        <div className="mb-6 space-y-4">
          <form className="relative">
            <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-mist" aria-hidden="true" />
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="q" className="sr-only">Search enquiries</label>
            <input id="q" name="q" defaultValue={q} placeholder="Search name, phone, email, service…" className="input !pl-11" />
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[undefined, ...STATUSES].map((s) => (
              <Link
                key={s ?? "all"}
                href={link(s)}
                className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                  status === s || (!status && !s) ? "border-gold-500 bg-gold-500/15 text-gold-300" : "border-white/12 text-mist hover:border-white/30"
                }`}
              >
                {s ? STATUS_LABEL[s] : "All"}
              </Link>
            ))}
          </div>
        </div>
      )}
      <EnquiryList items={items} showContact={isTeam} />
    </>
  );
}
