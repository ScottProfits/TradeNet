import { supabase } from "@/lib/supabase";

export async function GET() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: topTraders }, { data: recentTrades }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url, verified, trading_style")
      .order("followers_count", { ascending: false })
      .limit(10),
    supabase
      .from("trades")
      .select("ticker, strategy, pnl")
      .gte("created_at", since7d)
      .limit(500),
  ]);

  // Count ticker frequency
  const tickerCount: Record<string, number> = {};
  const strategyMap: Record<string, { count: number; wins: number; totalPnl: number }> = {};

  for (const t of recentTrades ?? []) {
    tickerCount[t.ticker] = (tickerCount[t.ticker] ?? 0) + 1;
    if (t.strategy) {
      const s = t.strategy.trim();
      if (!strategyMap[s]) strategyMap[s] = { count: 0, wins: 0, totalPnl: 0 };
      strategyMap[s].count += 1;
      strategyMap[s].totalPnl += t.pnl ?? 0;
      if ((t.pnl ?? 0) > 0) strategyMap[s].wins += 1;
    }
  }

  const trending = Object.entries(tickerCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }));

  const hotStrategies = Object.entries(strategyMap)
    .map(([name, s]) => ({
      name,
      count: s.count,
      winRate: Math.round((s.wins / s.count) * 100),
      avgPnl: Math.round(s.totalPnl / s.count),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return Response.json({ topTraders: topTraders ?? [], trending, hotStrategies });
}
