import Link from "next/link";
import { Download, Eye, FileText, IndianRupee, Trash2 } from "lucide-react";
import type { Payment, ProjectFile } from "@/lib/portal";
import { deleteFile, deletePayment } from "@/lib/portal-actions";
import { FILE_CATEGORY_LABEL, PAYMENT_METHOD_LABEL, fmtMoney } from "@/lib/portal-config";
import { Badge } from "./portal-ui";
import { ConfirmButton } from "./Live";
import { timeAgo } from "./ui";

const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDay = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const isPdf = (f: Pick<ProjectFile, "type" | "name">) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const CATEGORY_TONE = { QUOTATION: "gold", INVOICE: "sky", RECEIPT: "green", DOCUMENT: "muted" } as const;

/** Payments received, newest first. `showProject` adds the project name; `canDelete` is for the admin. */
export function PaymentList({ items, showProject, canDelete }: { items: Payment[]; showProject?: boolean; canDelete?: boolean }) {
  if (!items.length) return <div className="card p-8 text-center text-sm text-mist">No payments recorded yet.</div>;
  return (
    <ul className="card divide-y divide-white/5 overflow-hidden">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
            <IndianRupee size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold tabular-nums">{fmtMoney(p.amount, p.currency)}</p>
            <p className="truncate text-xs text-mist">
              {fmtDay(p.paidOn)} · {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
              {p.reference ? ` · Ref ${p.reference}` : ""}
              {showProject ? (
                <>
                  {" · "}
                  <Link href={`/dashboard/projects/${p.projectId}?tab=payments`} className="hover:text-gold-300 hover:underline">{p.projectName}</Link>
                </>
              ) : null}
            </p>
            {p.note && <p className="mt-1 text-sm text-mist">{p.note}</p>}
          </div>
          {canDelete && (
            <form action={deletePayment.bind(null, p.id)}>
              <ConfirmButton message={`Delete the payment of ${fmtMoney(p.amount, p.currency)} on ${fmtDay(p.paidOn)}?`} className="flex h-10 w-10 items-center justify-center rounded-full text-mist hover:bg-red-500/10 hover:text-red-200">
                <Trash2 size={15} aria-label="Delete payment" />
              </ConfirmButton>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Documents with their type badge, and View (PDF) / Download buttons. */
export function DocList({
  items,
  me,
  projectNames,
  empty = "No documents yet.",
}: {
  items: ProjectFile[];
  me: { id: string; role: string };
  /** projectId -> name; when given, each row links to its project. */
  projectNames?: Record<string, string>;
  empty?: string;
}) {
  if (!items.length) return <div className="card h-fit p-8 text-center text-sm text-mist">{empty}</div>;
  return (
    <ul className="card h-fit divide-y divide-white/5 overflow-hidden">
      {items.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:flex-nowrap">
          <FileText size={20} className="shrink-0 text-gold-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-semibold">{f.name}</p>
              {f.category !== "DOCUMENT" && (
                <Badge tone={CATEGORY_TONE[f.category as keyof typeof CATEGORY_TONE] ?? "muted"}>{FILE_CATEGORY_LABEL[f.category] ?? f.category}</Badge>
              )}
            </div>
            <p className="truncate text-xs text-mist">
              {fmtSize(f.size)} · {f.uploadedByName}
              {f.uploaderRole === "USER" ? " (client)" : ""} · {timeAgo(f.createdAt)}
              {projectNames ? (
                <>
                  {" · "}
                  <Link href={`/dashboard/projects/${f.projectId}?tab=docs`} className="hover:text-gold-300 hover:underline">{projectNames[f.projectId] ?? "Project"}</Link>
                </>
              ) : null}
            </p>
            {f.note && <p className="mt-1 text-sm text-mist">{f.note}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {isPdf(f) && (
              <a href={`/api/files/${f.id}?view=1`} target="_blank" rel="noopener" className="btn-ghost !min-h-10 !px-3 !py-2 text-sm">
                <Eye size={15} aria-hidden="true" /> <span className="hidden sm:inline">View</span>
              </a>
            )}
            <a href={`/api/files/${f.id}`} className="btn-ghost !min-h-10 !px-3 !py-2 text-sm" download>
              <Download size={15} aria-hidden="true" /> <span className="hidden sm:inline">Download</span>
            </a>
            {(me.role === "ADMIN" || f.uploadedById === me.id) && (
              <form action={deleteFile.bind(null, f.id)}>
                <ConfirmButton message={`Delete ${f.name}?`} className="flex h-10 w-10 items-center justify-center rounded-full text-mist hover:bg-red-500/10 hover:text-red-200">
                  <Trash2 size={15} aria-label="Delete document" />
                </ConfirmButton>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
