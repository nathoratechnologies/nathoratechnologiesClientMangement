import Link from "next/link";
import { STATUS_LABEL } from "@/lib/site";

const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-gold-500/15 text-gold-300 border-gold-500/30",
  IN_PROGRESS: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  QUOTED: "bg-violet-500/15 text-violet-200 border-violet-400/30",
  WON: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  CLOSED: "bg-white/5 text-mist border-white/15",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status] ?? STATUS_STYLE.CLOSED}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PageTitle({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-mist">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export const ref = (id: string) => `#${id.slice(-6).toUpperCase()}`;

export function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

type Row = {
  id: string;
  name: string;
  phone: string;
  service: string;
  status: string;
  createdAt: Date;
  assignedToName?: string | null;
};

export function EnquiryList({ items, showContact }: { items: Row[]; showContact: boolean }) {
  if (!items.length) {
    return <div className="card p-10 text-center text-mist">No enquiries here yet.</div>;
  }
  return (
    <ul className="card divide-y divide-white/5 overflow-hidden">
      {items.map((e) => (
        <li key={e.id}>
          <Link href={`/dashboard/enquiries/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-white/[0.04]">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {e.service} <span className="text-sm font-normal text-mist">{ref(e.id)}</span>
              </p>
              <p className="truncate text-sm text-mist">
                {showContact ? `${e.name} · ${e.phone}` : timeAgo(e.createdAt)}
                {showContact && e.assignedToName ? ` · ${e.assignedToName}` : ""}
              </p>
            </div>
            {showContact && <span className="text-xs text-mist">{timeAgo(e.createdAt)}</span>}
            <StatusBadge status={e.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
