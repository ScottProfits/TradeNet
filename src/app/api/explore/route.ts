import { supabase } from "@/lib/supabase";

export async function GET() {
  const [{ data: topTraders }, { data: trendingTickers }, { data: recentPosts }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, handle, full_name, avatar_url, verified, trading_style")
      .order("followers_count", { ascending: false })
      .limit(10),
    supabase
      .from("trades")
      .select("ticker")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(200),
    supabase
      .from("posts")
      .select("id, content, likes_count, created_at, user_id")
      .order("likes_count", { ascending: false })
      .limit(5),
  ]);

  // Count ticker frequency
  const tickerCount: Record<string, number> = {};
  for (const t of trendingTickers ?? []) {
    tickerCount[t.ticker] = (tickerCount[t.ticker] ?? 0) + 1;
  }
  const trending = Object.entries(tickerCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ticker, count]) => ({ ticker, count }));

  return Response.json({ topTraders: topTraders ?? [], trending, recentPosts: recentPosts ?? [] });
}
