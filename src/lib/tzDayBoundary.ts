export const DEFAULT_TZ = "America/New_York";

// Server runs in UTC; "today"/"this month" must be judged in the viewer's
// timezone, not the server's, or a trade made earlier today can land on
// "yesterday" in UTC and get excluded from "today" boundaries.
function tzOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const asIfUTC = Date.UTC(Number(map.year), Number(map.month) - 1, Number(map.day), Number(map.hour), Number(map.minute), Number(map.second));
  return asIfUTC - date.getTime();
}

export function startOfDayInTz(daysAgo: number, timeZone = DEFAULT_TZ): Date {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - daysAgo);
  const dateStr = now.toLocaleDateString("en-CA", { timeZone }); // YYYY-MM-DD in that zone
  const asUTCMidnight = new Date(`${dateStr}T00:00:00.000Z`);
  return new Date(asUTCMidnight.getTime() - tzOffsetMs(timeZone, asUTCMidnight));
}

export function startOfMonthInTz(monthsAgo: number, timeZone = DEFAULT_TZ): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const target = new Date(Date.UTC(Number(map.year), Number(map.month) - 1 - monthsAgo, 1));
  const dateStr = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const asUTCMidnight = new Date(`${dateStr}T00:00:00.000Z`);
  return new Date(asUTCMidnight.getTime() - tzOffsetMs(timeZone, asUTCMidnight));
}

export function resolveTimeZone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}
