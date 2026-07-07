import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

const MARKET_TZ = "America/New_York";

// Server runs in UTC; "today"/"this month" must be judged in the market's
// timezone, not the server's, or a trade made earlier today (US time) can
// land on "yesterday" in UTC and get excluded from "today" boundaries.
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

function startOfDayInTz(daysAgo: number, timeZone = MARKET_TZ): Date {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() - daysAgo);
  const dateStr = now.toLocaleDateString("en-CA", { timeZone }); // YYYY-MM-DD in that zone
  const asUTCMidnight = new Date(`${dateStr}T00:00:00.000Z`);
  return new Date(asUTCMidnight.getTime() - tzOffsetMs(timeZone, asUTCMidnight));
}

function startOfMonthInTz(monthsAgo: number, timeZone = MARKET_TZ): Date {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit" }).formatToParts(now);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const target = new Date(Date.UTC(Number(map.year), Number(map.month) - 1 - monthsAgo, 1));
  const dateStr = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const asUTCMidnight = new Date(`${dateStr}T00:00:00.000Z`);
  return new Date(asUTCMidnight.getTime() - tzOffsetMs(timeZone, asUTCMidnight));
}

function getRange(period: string, timeZone: string): string | null {
  if (period === "today") return startOfDayInTz(0, timeZone).toISOString();
  if (period === "week") { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString(); }
  if (period === "month") return startOfMonthInTz(0, timeZone).toISOString();
  return null;
}

function getPrevRange(period: string, timeZone: string): [string, string] | null {
  if (period === "today") return [startOfDayInTz(1, timeZone).toISOString(), startOfDayInTz(0, timeZone).toISOString()];
  if (period === "week") {
    const s = new Date(); s.setDate(s.getDate() - 14);
    const e = new Date(); e.setDate(e.getDate() - 7);
    return [s.toISOString(), e.toISOString()];
  }
  if (period === "month") return [startOfMonthInTz(1, timeZone).toISOString(), startOfMonthInTz(0, timeZone).toISOString()];
  return null;
}

function resolveTimeZone(tz: string | null): string {
  if (!tz) return MARKET_TZ;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return MARKET_TZ;
  }
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "all";
  const timeZone = resolveTimeZone(req.nextUrl.searchParams.get("tz"));
  const since = getRange(period, timeZone);
  const prevRange = getPrevRange(period, timeZone);

  let query = supabase
    .from("trades")
    .select("user_id, pnl, profiles!trades_user_id_fkey(id, handle, full_name, avatar_url, verified, brokerage)");
  if (since) query = query.gte("created_at", since);

  const [{ data: trades }, prevResult] = await Promise.all([
    query,
    prevRange
      ? supabase.from("trades").select("user_id, pnl").gte("created_at", prevRange[0]).lt("created_at", prevRange[1])
      : Promise.resolve({ data: null }),
  ]);

  if (!trades) return Response.json([]);

  // Aggregate current period
  const map = new Map<string, { pnl: number; trades: number; wins: number; profile: unknown }>();
  for (const t of trades) {
    const existing = map.get(t.user_id);
    if (existing) { existing.pnl += t.pnl ?? 0; existing.trades += 1; if ((t.pnl ?? 0) > 0) existing.wins += 1; }
    else map.set(t.user_id, { pnl: t.pnl ?? 0, trades: 1, wins: (t.pnl ?? 0) > 0 ? 1 : 0, profile: t.profiles });
  }

  const ranked = Array.from(map.entries())
    .map(([id, v]) => ({ id, profile: v.profile, pnl: Math.round(v.pnl * 100) / 100, tradeCount: v.trades, winRate: v.trades > 0 ? Math.round((v.wins / v.trades) * 100) : 0 }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 50);

  // Build previous rank map
  const prevRankMap = new Map<string, number>();
  if (prevResult.data) {
    const prevAgg = new Map<string, number>();
    for (const t of prevResult.data) prevAgg.set(t.user_id, (prevAgg.get(t.user_id) ?? 0) + (t.pnl ?? 0));
    Array.from(prevAgg.entries()).sort((a, b) => b[1] - a[1]).forEach(([id], i) => prevRankMap.set(id, i + 1));
  }

  return Response.json(
    ranked.map((entry, i) => {
      const prevRank = prevRankMap.get(entry.id);
      const rankChange = prevRank != null ? prevRank - (i + 1) : null;
      return { profile: entry.profile, pnl: entry.pnl, tradeCount: entry.tradeCount, winRate: entry.winRate, rankChange };
    })
  );
}
