import "server-only";
import { getUserById } from "./db";
import { entryMs, listEntries, type Project, type TimeEntry } from "./portal";
import { amountFor, fmtDuration, fmtMoney, msToHours } from "./portal-config";
import { site, waLink } from "./site";
import { toWaNumber } from "./whatsapp";

const TZ = "Asia/Kolkata";
export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
export const dayOf = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const clock = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TZ });
const longDay = (day: string) =>
  new Date(`${day}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: TZ });

export type DayBill = {
  day: string;
  sessions: TimeEntry[];
  dayMs: number;
  dayAmount: number;
  totalMs: number;
  totalAmount: number;
  text: string;
  /** Client's WhatsApp number (digits), or null when none is saved. */
  phone: string | null;
  clientName: string;
  /** wa.me link that opens WhatsApp with the bill typed in. */
  waUrl: string | null;
};

/** Everything worked on `project` on `day` (YYYY-MM-DD, India time), as numbers and as a WhatsApp message. */
export async function buildDayBill(project: Project, day: string): Promise<DayBill> {
  const [all, client] = await Promise.all([listEntries({ projectId: project.id }), getUserById(project.clientId)]);
  const now = Date.now();
  // Finished sessions only: a running timer has no end time to bill yet.
  const done = all.filter((e) => e.endedAt);
  const sessions = done.filter((e) => dayOf(e.startedAt) === day).sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const dayMs = sessions.reduce((s, e) => s + entryMs(e, now), 0);
  const totalMs = done.reduce((s, e) => s + entryMs(e, now), 0);
  const rate = project.hourlyRate;
  const cur = project.currency;
  const money = (ms: number) => fmtMoney(amountFor(ms, rate), cur);
  const team = new Set(sessions.map((s) => s.userName)).size > 1;

  const lines = [
    `*${site.name} — Work report*`,
    `Project: ${project.name}`,
    `Date: ${longDay(day)}`,
    "",
    "Work done:",
    ...(sessions.length
      ? sessions.map((s) => {
          const what = [s.bugTitle ? `Bug: ${s.bugTitle}` : "", s.note].filter(Boolean).join(" — ");
          return `• ${clock(s.startedAt)} – ${clock(s.endedAt!)} · ${fmtDuration(entryMs(s, now))}${team ? ` (${s.userName})` : ""}${what ? `\n   ${what}` : ""}`;
        })
      : ["• No finished work sessions on this day"]),
    "",
    `Total time: ${fmtDuration(dayMs)} (${msToHours(dayMs).toFixed(2)} h)`,
    ...(rate > 0 ? [`Rate: ${fmtMoney(rate, cur)} / hour`, `*Amount: ${money(dayMs)}*`] : []),
    "",
    `Project total so far: ${fmtDuration(totalMs)}${rate > 0 ? ` · ${money(totalMs)}` : ""}`,
    `Full report: ${site.url}/dashboard/projects/${project.id}?tab=billing`,
  ];
  const text = lines.join("\n");
  const phone = client?.phone ? toWaNumber(client.phone) : null;

  return {
    day,
    sessions,
    dayMs,
    dayAmount: amountFor(dayMs, rate),
    totalMs,
    totalAmount: amountFor(totalMs, rate),
    text,
    phone,
    clientName: client?.name ?? project.clientName,
    waUrl: phone ? waLink(phone, text) : null,
  };
}
