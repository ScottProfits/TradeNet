import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  const now = new Date();

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const [
    { data: topTraders },
    { data: recentTrades },
    { data: todayTrades },
    { data: prev7dTrades },
    { data: following },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url, verified, trading_style")
      .order("followers_count", { ascending: false })
      .limit(10),
    supabase
      .from("trades")
      .select("ticker, strategy, pnl, user_id")
      .gte("created_at", since7d.toISOString())
      .limit(500),
    supabase
      .from("trades")
      .select("user_id, pnl, profiles!trades_user_id_fkey(id, handle, avatar_url, verified)")
      .gte("created_at", todayStart.toISOString())
      .limit(300),
    supabase
      .from("trades")
      .select("user_id, pnl")
      .gte("created_at", since14d.toISOString())
      .lt("created_at", since7d.toISOString())
      .limit(500),
    userId
      ? supabase.from("follows").select("following_id").eq("follower_id", userId)
      : Promise.resolve({ data: [] }),
  ]);

  // Trending tickers
  const tickerCount: Record<string, number> = {};
  const strategyMap: Record<string, { count: number; wins: number; totalPnl: number }> = {};
  for (const t of recentTrades ?? []) {
    tickerCount[t.ticker] = (tickerCount[t.ticker] ?? 0) + 1;
    if (t.strategy?.trim()) {
      const s = t.strategy.trim();
      if (!strategyMap[s]) strategyMap[s] = { count: 0, wins: 0, totalPnl: 0 };
      strategyMap[s].count += 1;
      strategyMap[s].totalPnl += t.pnl ?? 0;
      if ((t.pnl ?? 0) > 0) strategyMap[s].wins += 1;
    }
  }

  const trending = Object.entries(tickerCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }));

  const hotStrategies = Object.entries(strategyMap)
    .map(([name, s]) => ({ name, count: s.count, winRate: Math.round((s.wins / s.count) * 100), avgPnl: Math.round(s.totalPnl / s.count) }))
    .sort((a, b) => b.count - a.count).slice(0, 8);

  // Top Today — aggregate today's pnl per user
  type ProfileShape = { id: string; handle: string; avatar_url: string; verified: boolean };
  const todayMap = new Map<string, { pnl: number; trades: number; profile: ProfileShape | null }>();
  for (const t of todayTrades ?? []) {
    const existing = todayMap.get(t.user_id);
    if (existing) { existing.pnl += t.pnl ?? 0; existing.trades += 1; }
    else todayMap.set(t.user_id, { pnl: t.pnl ?? 0, trades: 1, profile: t.profiles as unknown as ProfileShape });
  }
  const topToday = Array.from(todayMap.values())
    .filter((v) => v.profile)
    .sort((a, b) => b.pnl - a.pnl).slice(0, 5)
    .map((v) => ({ profile: v.profile, pnl: Math.round(v.pnl * 100) / 100, trades: v.trades }));

  // Most Improved — compare last 7 days vs prior 7 days
  const recentPnl: Record<string, number> = {};
  for (const t of recentTrades ?? []) recentPnl[t.user_id] = (recentPnl[t.user_id] ?? 0) + (t.pnl ?? 0);
  const prevPnl: Record<string, number> = {};
  for (const t of prev7dTrades ?? []) prevPnl[t.user_id] = (prevPnl[t.user_id] ?? 0) + (t.pnl ?? 0);

  const improvedIds = Object.keys(recentPnl)
    .map((id) => ({ id, delta: (recentPnl[id] ?? 0) - (prevPnl[id] ?? 0) }))
    .filter((x) => x.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 5)
    .map((x) => x.id);

  let mostImproved: { profile: unknown; delta: number }[] = [];
  if (improvedIds.length > 0) {
    const { data: improvedProfiles } = await supabase
      .from("profiles").select("id, handle, avatar_url, verified").in("id", improvedIds);
    const profileMap = Object.fromEntries((improvedProfiles ?? []).map((p) => [p.id, p]));
    mostImproved = improvedIds
      .filter((id) => profileMap[id])
      .map((id) => ({ profile: profileMap[id], delta: Math.round(((recentPnl[id] ?? 0) - (prevPnl[id] ?? 0)) * 100) / 100 }));
  }

  // Suggested Traders — popular traders the current user doesn't follow
  const followingSet = new Set((following ?? []).map((f: { following_id: string }) => f.following_id));
  followingSet.add(userId ?? "");
  const suggested = (topTraders ?? [])
    .filter((t) => !followingSet.has(t.id))
    .slice(0, 5);

  return Response.json({ topTraders: topTraders ?? [], trending, hotStrategies, topToday, mostImproved, suggested });
}
