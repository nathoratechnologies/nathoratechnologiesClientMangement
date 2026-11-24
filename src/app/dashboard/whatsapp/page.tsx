import Link from "next/link";
import { listLogs } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { PageTitle, ref, timeAgo } from "@/components/dash/ui";

export default async function WhatsAppPage() {
  await requireUser(["ADMIN"]);
  const configured = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  const logs = await listLogs(500);
  const c = (s: string) => logs.filter((l) => l.status === s).length;

  return (
    <>
      <PageTitle title="WhatsApp auto-messages" sub="Every new enquiry sends a confirmation to the customer and an alert to the admin number." />

      <div className={`card mb-6 p-5 ${configured ? "border-emerald-400/30" : "border-gold-500/40"}`}>
        <p className="font-semibold">{configured ? "WhatsApp Cloud API is connected" : "WhatsApp Cloud API is not connected yet"}</p>
        <p className="mt-1 text-sm text-mist">
          {configured
            ? `Alerts go to ${process.env.WHATSAPP_ADMIN_NUMBER || "(no admin number set)"}. Template: ${process.env.WHATSAPP_TEMPLATE_NAME || "plain text"}.`
            : "Messages are logged as skipped. Add WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ADMIN_NUMBER to the environment to switch on automatic sending."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        {["SENT", "FAILED", "SKIPPED"].map((s) => (
          <div key={s} className="card p-5">
            <p className="font-display text-3xl font-bold">{c(s)}</p>
            <p className="text-sm text-mist">{s.toLowerCase()}</p>
          </div>
        ))}
      </div>

      {logs.length === 0 ? (
        <div className="card p-10 text-center text-mist">No WhatsApp messages yet.</div>
      ) : (
        <ul className="card divide-y divide-white/5 overflow-hidden">
          {logs.slice(0, 100).map((l) => (
            <li key={l.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {l.kind.replaceAll("_", " ").toLowerCase()} → +{l.to}
                  {l.enquiryId && (
                    <Link href={`/dashboard/enquiries/${l.enquiryId}`} className="ml-2 font-normal text-gold-400 hover:underline">{ref(l.enquiryId)}</Link>
                  )}
                </p>
                <span className="text-xs text-mist">
                  <span className={l.status === "SENT" ? "text-emerald-300" : l.status === "FAILED" ? "text-red-300" : "text-gold-300"}>{l.status.toLowerCase()}</span> · {timeAgo(l.createdAt)}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-mist">{l.body}</p>
              {l.status === "FAILED" && l.detail && <p className="mt-1 line-clamp-2 font-mono text-xs text-red-300/80">{l.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
