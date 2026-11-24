/* Client-portal constants, safe to import from server and client components. */

export const PROJECT_STATUSES = ["PLANNING", "DEVELOPING", "TESTING", "DEPLOYING", "LIVE", "MAINTENANCE", "ON_HOLD"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  PLANNING: "Planning",
  DEVELOPING: "Developing",
  TESTING: "Testing",
  DEPLOYING: "Deploying",
  LIVE: "Live / Working",
  MAINTENANCE: "Maintenance",
  ON_HOLD: "On hold",
};

/** Steps shown in the project progress bar (ON_HOLD / MAINTENANCE are shown as badges instead). */
export const PROJECT_PIPELINE = ["PLANNING", "DEVELOPING", "TESTING", "DEPLOYING", "LIVE"] as const;

export const BUG_STATUSES = ["REPORTED", "ASSIGNED", "DEVELOPING", "PROCESSING", "DEPLOYING", "FIXED", "CLOSED"] as const;
export type BugStatus = (typeof BUG_STATUSES)[number];

export const BUG_STATUS_LABEL: Record<string, string> = {
  REPORTED: "Reported",
  ASSIGNED: "Assigned",
  DEVELOPING: "Developing",
  PROCESSING: "Processing / Testing",
  DEPLOYING: "Deploying",
  FIXED: "Fixed",
  CLOSED: "Closed",
};

export const BUG_PIPELINE = ["REPORTED", "ASSIGNED", "DEVELOPING", "PROCESSING", "DEPLOYING", "FIXED"] as const;
export const OPEN_BUG_STATUSES: readonly string[] = ["REPORTED", "ASSIGNED", "DEVELOPING", "PROCESSING", "DEPLOYING"];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const UPDATE_KINDS = ["FEATURE", "FIX", "IMPROVEMENT", "DEPLOYMENT", "NOTE"] as const;
export const UPDATE_KIND_LABEL: Record<string, string> = {
  FEATURE: "New feature",
  FIX: "Bug fix",
  IMPROVEMENT: "Improvement",
  DEPLOYMENT: "Deployment",
  NOTE: "Note",
};

export const CURRENCIES = ["INR", "USD", "AED", "EUR", "GBP"] as const;

/* ---------- Time & money helpers ---------- */

export const msToHours = (ms: number) => ms / 3_600_000;

/** "3h 25m" (or "45m", "0m"). */
export function fmtDuration(ms: number) {
  const totalMin = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** "01:02:03" for a live timer. */
export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export function fmtMoney(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export const amountFor = (ms: number, rate: number) => Math.round(msToHours(ms) * rate * 100) / 100;
