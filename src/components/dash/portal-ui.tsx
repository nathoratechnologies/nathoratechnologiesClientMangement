import Link from "next/link";
import { Check, Bug as BugIcon, FolderKanban } from "lucide-react";
import { BUG_STATUS_LABEL, PROJECT_STATUS_LABEL, fmtDuration } from "@/lib/portal-config";
import { ref, timeAgo } from "./ui";

const TONE = {
  gold: "bg-gold-500/15 text-gold-300 border-gold-500/30",
  sky: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  violet: "bg-violet-500/15 text-violet-200 border-violet-400/30",
  orange: "bg-orange-500/15 text-orange-200 border-orange-400/30",
  green: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  red: "bg-red-500/15 text-red-200 border-red-400/30",
  muted: "bg-white/5 text-mist border-white/15",
} as const;
type Tone = keyof typeof TONE;

const PROJECT_TONE: Record<string, Tone> = {
  PLANNING: "gold",
  DEVELOPING: "sky",
  TESTING: "violet",
  DEPLOYING: "orange",
  LIVE: "green",
  MAINTENANCE: "sky",
  ON_HOLD: "muted",
};
const BUG_TONE: Record<string, Tone> = {
  REPORTED: "red",
  ASSIGNED: "gold",
  DEVELOPING: "sky",
  PROCESSING: "violet",
  DEPLOYING: "orange",
  FIXED: "green",
  CLOSED: "muted",
};
const PRIORITY_TONE: Record<string, Tone> = { LOW: "muted", MEDIUM: "sky", HIGH: "orange", CRITICAL: "red" };

export function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export const ProjectStatusBadge = ({ status }: { status: string }) => (
  <Badge tone={PROJECT_TONE[status] ?? "muted"}>{PROJECT_STATUS_LABEL[status] ?? status}</Badge>
);
export const BugStatusBadge = ({ status }: { status: string }) => (
  <Badge tone={BUG_TONE[status] ?? "muted"}>{BUG_STATUS_LABEL[status] ?? status}</Badge>
);
export const PriorityBadge = ({ priority }: { priority: string }) => (
  <Badge tone={PRIORITY_TONE[priority] ?? "muted"}>{priority.charAt(0) + priority.slice(1).toLowerCase()}</Badge>
);

/** Green pulsing "working now" indicator with the names of whoever has a timer running. */
export function WorkingNow({ who, compact }: { who: Record<string, string>; compact?: boolean }) {
  const names = Object.values(who ?? {});
  if (!names.length) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      {compact ? "Working now" : `Working now: ${names.join(", ")}`}
    </span>
  );
}

/**
 * Step-by-step progress bar. When `current` is not one of the steps
 * (e.g. On hold / Closed) all steps are greyed and `offLabel` explains why.
 */
export function Pipeline({ steps, labels, current, offLabel }: { steps: readonly string[]; labels: Record<string, string>; current: string; offLabel?: string }) {
  const idx = steps.indexOf(current);
  return (
    <div>
      <ol className="flex items-start" aria-label="Progress">
        {steps.map((s, i) => {
          const done = idx >= 0 && i < idx;
          const now = i === idx;
          const last = i === steps.length - 1;
          return (
            <li key={s} className="relative flex flex-1 flex-col items-center text-center" aria-current={now ? "step" : undefined}>
              {!last && (
                <span
                  className={`absolute top-4 left-1/2 h-0.5 w-full ${idx >= 0 && i < idx ? "bg-gradient-to-r from-gold-400 to-gold-500" : "bg-white/10"}`}
                  aria-hidden="true"
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold ${
                  done
                    ? "border-gold-500 bg-gold-500 text-navy-950"
                    : now
                      ? "border-gold-400 bg-navy-900 text-gold-300 shadow-[0_0_0_4px_rgb(212_162_76/0.2)]"
                      : "border-white/15 bg-navy-900 text-mist/60"
                }`}
              >
                {done ? <Check size={14} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`mt-2 px-0.5 text-[11px] leading-tight sm:text-xs ${now ? "font-semibold text-gold-300" : done ? "text-white" : "text-mist/60"}`}>
                {labels[s] ?? s}
              </span>
            </li>
          );
        })}
      </ol>
      {idx < 0 && offLabel && <p className="mt-4 text-center text-sm text-mist">{offLabel}</p>}
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="card p-5">
      {Icon && <Icon size={20} className="mb-3 text-gold-400" />}
      <p className="font-display text-2xl font-bold sm:text-3xl">{value}</p>
      <p className="text-sm text-mist">{label}</p>
      {sub && <p className="mt-1 text-xs text-mist/70">{sub}</p>}
    </div>
  );
}

type BugRow = {
  id: string;
  title: string;
  projectName: string;
  status: string;
  priority: string;
  assignedToName: string | null;
  createdAt: Date;
  workingNow: Record<string, string>;
};

export function BugList({ items, showProject = true, hours }: { items: BugRow[]; showProject?: boolean; hours?: Record<string, number> }) {
  if (!items.length) return <div className="card p-10 text-center text-mist">No bugs here. 🎉</div>;
  return (
    <ul className="card divide-y divide-white/5 overflow-hidden">
      {items.map((b) => (
        <li key={b.id}>
          <Link href={`/dashboard/bugs/${b.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-white/[0.04]">
            <BugIcon size={18} className="shrink-0 text-mist" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {b.title} <span className="text-sm font-normal text-mist">{ref(b.id)}</span>
              </p>
              <p className="truncate text-sm text-mist">
                {showProject ? `${b.projectName} · ` : ""}
                {b.assignedToName ? `→ ${b.assignedToName}` : "Not assigned yet"} · {timeAgo(b.createdAt)}
                {hours?.[b.id] ? ` · ${fmtDuration(hours[b.id])}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WorkingNow who={b.workingNow} compact />
              <PriorityBadge priority={b.priority} />
              <BugStatusBadge status={b.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

type ProjectRow = { id: string; name: string; clientName: string; status: string; updatedAt: Date; workingNow: Record<string, string> };

export function ProjectList({ items, showClient, openBugs }: { items: ProjectRow[]; showClient: boolean; openBugs?: Record<string, number> }) {
  if (!items.length) return <div className="card p-10 text-center text-mist">No projects yet.</div>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {items.map((p) => (
        <li key={p.id}>
          <Link href={`/dashboard/projects/${p.id}`} className="card block h-full p-5 transition hover:border-gold-500/40">
            <div className="flex items-start justify-between gap-3">
              <FolderKanban size={22} className="text-gold-400" aria-hidden="true" />
              <ProjectStatusBadge status={p.status} />
            </div>
            <p className="font-display mt-4 text-lg font-semibold">{p.name}</p>
            <p className="text-sm text-mist">
              {showClient ? `${p.clientName} · ` : ""}updated {timeAgo(p.updatedAt)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <WorkingNow who={p.workingNow} compact />
              {openBugs?.[p.id] ? <Badge tone="red">{openBugs[p.id]} open bug{openBugs[p.id] === 1 ? "" : "s"}</Badge> : null}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Link-based tabs (work without JavaScript and keep the URL shareable). */
export function Tabs({ tabs, active }: { tabs: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav className="mb-6 flex gap-2 overflow-x-auto pb-1 print:hidden" aria-label="Sections">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          scroll={false}
          aria-current={t.key === active ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
            t.key === active ? "border-gold-500 bg-gold-500/15 text-gold-300" : "border-white/12 text-mist hover:border-white/30"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
