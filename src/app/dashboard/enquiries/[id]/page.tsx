import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, MessageCircle, Mail, Trash2 } from "lucide-react";
import { getEnquiry, listLogsForEnquiry, listMessages, listUsers } from "@/lib/db";
import { requireUser, canAccessEnquiry } from "@/lib/auth";
import { STATUSES, STATUS_LABEL, site, waLink } from "@/lib/site";
import { updateEnquiry, sendWhatsApp, deleteEnquiry } from "@/lib/actions";
import { StatusBadge, ref, timeAgo } from "@/components/dash/ui";
import { Chat } from "@/components/dash/Chat";
import { toWaNumber } from "@/lib/whatsapp";

export default async function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const enquiry = await getEnquiry(id);
  if (!enquiry || !canAccessEnquiry(user, enquiry)) notFound();
  const team = user.role !== "USER";
  const [messages, whatsappLogs, allUsers] = await Promise.all([
    listMessages(id),
    team ? listLogsForEnquiry(id) : Promise.resolve([]),
    user.role === "ADMIN" ? listUsers() : Promise.resolve([]),
  ]);
  const e = { ...enquiry, whatsappLogs };
  const staff = allUsers.filter((u) => u.active && (u.role === "STAFF" || u.role === "ADMIN"));
  const initial = messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));
  const customerWa = waLink(toWaNumber(e.phone), `Hi ${e.name.split(" ")[0]}, this is Nathora Technologies regarding your enquiry ${ref(e.id)}.`);

  return (
    <>
      <Link href="/dashboard/enquiries" className="mb-6 inline-flex items-center gap-2 text-sm text-mist hover:text-white">
        <ArrowLeft size={16} aria-hidden="true" /> Back to enquiries
      </Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-mist">Enquiry {ref(e.id)} · {timeAgo(e.createdAt)}</p>
          <h1 className="font-display mt-1 text-2xl font-bold sm:text-3xl">{e.service}</h1>
        </div>
        <StatusBadge status={e.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="order-2 lg:order-1">
          <Chat enquiryId={e.id} meId={user.id} initial={initial} />
        </div>

        <div className="order-1 space-y-6 lg:order-2">
          {/* contact actions */}
          <div className="card p-5">
            <h2 className="font-display mb-4 font-semibold">{team ? "Customer" : "Contact us"}</h2>
            {team ? (
              <>
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-mist">Name</dt><dd className="font-medium">{e.name}</dd></div>
                  <div><dt className="text-mist">Phone</dt><dd className="font-medium">{e.phone}</dd></div>
                  <div><dt className="text-mist">Email</dt><dd className="font-medium break-all">{e.email}</dd></div>
                  <div><dt className="text-mist">Prefers</dt><dd className="font-medium">{e.preferred.toLowerCase()}</dd></div>
                  {e.budget && <div><dt className="text-mist">Budget</dt><dd className="font-medium">{e.budget}</dd></div>}
                </dl>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <a href={`tel:${e.phone}`} className="btn-ghost !rounded-xl !px-2 text-sm"><Phone size={16} aria-hidden="true" /> Call</a>
                  <a href={customerWa} target="_blank" rel="noopener noreferrer" className="btn-ghost !rounded-xl !px-2 text-sm"><MessageCircle size={16} className="text-[#25D366]" aria-hidden="true" /> Chat</a>
                  <a href={`mailto:${e.email}`} className="btn-ghost !rounded-xl !px-2 text-sm"><Mail size={16} aria-hidden="true" /> Email</a>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <a href={`tel:${site.phone}`} className="btn-ghost !rounded-xl text-sm"><Phone size={16} className="text-gold-400" aria-hidden="true" /> Call us</a>
                <a href={waLink(site.whatsapp, `Hi, about my enquiry ${ref(e.id)}`)} target="_blank" rel="noopener noreferrer" className="btn-ghost !rounded-xl text-sm">
                  <MessageCircle size={16} className="text-[#25D366]" aria-hidden="true" /> WhatsApp
                </a>
              </div>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-display mb-2 font-semibold">Message</h2>
            <p className="text-sm leading-relaxed whitespace-pre-wrap text-mist">{e.message}</p>
          </div>

          {team && (
            <form action={updateEnquiry.bind(null, e.id)} className="card space-y-4 p-5">
              <h2 className="font-display font-semibold">Manage</h2>
              <div>
                <label className="label" htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={e.status} className="input">
                  {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              {user.role === "ADMIN" && (
                <div>
                  <label className="label" htmlFor="assignedToId">Assigned to</label>
                  <select id="assignedToId" name="assignedToId" defaultValue={e.assignedToId ?? ""} className="input">
                    <option value="">Unassigned</option>
                    {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role.toLowerCase()})</option>)}
                  </select>
                </div>
              )}
              <button className="btn-gold w-full">Save changes</button>
            </form>
          )}

          {team && (
            <form action={sendWhatsApp.bind(null, e.id)} className="card space-y-4 p-5">
              <h2 className="font-display font-semibold">Send WhatsApp</h2>
              <label htmlFor="wa-body" className="sr-only">WhatsApp message</label>
              <textarea id="wa-body" name="body" rows={3} required className="input resize-none" placeholder={`Hi ${e.name.split(" ")[0]}, …`} />
              <button className="btn-ghost w-full"><MessageCircle size={16} className="text-[#25D366]" aria-hidden="true" /> Send via WhatsApp API</button>
              {e.whatsappLogs.length > 0 && (
                <ul className="space-y-1 border-t border-white/10 pt-3 text-xs text-mist">
                  {e.whatsappLogs.map((l) => (
                    <li key={l.id} className="flex justify-between gap-2">
                      <span>{l.kind.replace("_", " ").toLowerCase()}</span>
                      <span className={l.status === "SENT" ? "text-emerald-300" : l.status === "FAILED" ? "text-red-300" : ""}>{l.status.toLowerCase()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </form>
          )}

          {user.role === "ADMIN" && (
            <form action={deleteEnquiry.bind(null, e.id)}>
              <button className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-red-400/30 text-sm text-red-200 hover:bg-red-500/10">
                <Trash2 size={16} aria-hidden="true" /> Delete enquiry
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
