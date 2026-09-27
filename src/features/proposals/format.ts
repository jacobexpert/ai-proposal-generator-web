const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });

/** "3 hours ago", "yesterday"… for an ISO timestamp. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "—";
  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return relative.format(Math.round(seconds / 86400), "day");
  if (abs < 86400 * 365) return relative.format(Math.round(seconds / (86400 * 30)), "month");
  return relative.format(Math.round(seconds / (86400 * 365)), "year");
}

/** Today as `YYYY-MM-DD` in UTC: deadlines are UTC calendar dates (spec US-BE-05 D5). */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** A `YYYY-MM-DD` deadline as "Oct 4, 2026". */
export function formatDeadline(date: string | null | undefined): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : dateFormat.format(parsed);
}

export type DeadlineUrgency = { level: "overdue" | "soon"; label: string } | null;

/** US-FE-05 AC5: highlight deadlines within 3 days (and overdue ones) while work is still open. */
export function deadlineUrgency(
  date: string | null | undefined,
  done: boolean,
  now: Date = new Date(),
): DeadlineUrgency {
  if (!date || done) return null;
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${todayUtc(now)}T00:00:00Z`)) / 86_400_000);
  if (Number.isNaN(days)) return null;
  if (days < 0) return { level: "overdue", label: "Overdue" };
  if (days === 0) return { level: "soon", label: "Due today" };
  if (days <= 3) return { level: "soon", label: days === 1 ? "Due tomorrow" : `Due in ${days} days` };
  return null;
}
