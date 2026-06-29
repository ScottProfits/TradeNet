import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

function getRange(period: string): string | null {
  const now = new Date();
  if (period === "today") { const d = new Date(now); d.setHours(0, 0, 0, 0); return d.toISOString(); }
  if (period === "week") { const d = new Date(now); d.setDate(d.getDate() - 7); return d.toISOString(); }
  if (period === "month") { const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString(); }
  return null;
}

function getPrevRange(period: string): [string, string] | null {
  const now = new Date();
  if (period === "today") {
    const s = new Date(now); s.setDate(s.getDate() - 1); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setHours(0, 0, 0, 0);
    return [s.toISOString(), e.toISOString()];
  }
  if (period === "week") {
    const s = new Date(now); s.setDate(s.getDate() - 14);
    const e = new Date(now); e.setDate(e.getDate() - 7);
    return [s.toISOString(), e.toISOString()];
  }
  if (period === "month") {
    const s = new Date(now); s.setMonth(s.getMonth() - 1); s.setDate(1); s.setHours(0, 0, 0, 0);
    const e = new Date(now); e.setDate(1); e.setHours(0, 0, 0, 0);
    return [s.toISOString(), e.toISOString()];
  }
  return null;
}

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "all";
  const since = getRange(period);
  const prevRange = getPrevRange(period);

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
