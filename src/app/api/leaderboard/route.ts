import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const period = req.nextUrl.searchParams.get("period") ?? "all";

  let since: string | null = null;
  const now = new Date();
  if (period === "today") {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    since = d.toISOString();
  } else if (period === "week") {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    since = d.toISOString();
  } else if (period === "month") {
    const d = new Date(now); d.setDate(1); d.setHours(0, 0, 0, 0);
    since = d.toISOString();
  }

  let query = supabase
    .from("trades")
    .select("user_id, pnl, profiles!trades_user_id_fkey(id, handle, full_name, avatar_url, verified, brokerage)");

  if (since) query = query.gte("created_at", since);

  const { data: trades } = await query;

  if (!trades) return Response.json([]);

  // Aggregate by user
  const map = new Map<string, { pnl: number; trades: number; wins: number; profile: unknown }>();
  for (const t of trades) {
    const key = t.user_id;
    const existing = map.get(key);
    if (existing) {
      existing.pnl += t.pnl ?? 0;
      existing.trades += 1;
      if ((t.pnl ?? 0) > 0) existing.wins += 1;
    } else {
      map.set(key, {
        pnl: t.pnl ?? 0,
        trades: 1,
        wins: (t.pnl ?? 0) > 0 ? 1 : 0,
        profile: t.profiles,
      });
    }
  }

  const ranked = Array.from(map.entries())
    .map(([, v]) => ({
      profile: v.profile,
      pnl: Math.round(v.pnl * 100) / 100,
      tradeCount: v.trades,
      winRate: v.trades > 0 ? Math.round((v.wins / v.trades) * 100) : 0,
    }))
    .sort((a, b) => b.pnl - a.pnl)
    .slice(0, 50);

  return Response.json(ranked);
}
