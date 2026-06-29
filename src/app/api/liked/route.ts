import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const [{ data: likedTrades }, { data: likedPosts }] = await Promise.all([
    supabase
      .from("likes")
      .select("trade_id, trades(id, ticker, direction, pnl, pnl_percent, caption, image_url, created_at, profiles!trades_user_id_fkey(handle, avatar_url, verified))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("post_likes")
      .select("post_id, posts(id, content, image_url, likes_count, created_at, profiles!posts_user_id_fkey(handle, avatar_url, verified))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const trades = (likedTrades ?? [])
    .filter((r) => r.trades)
    .map((r) => ({ type: "trade" as const, ...(r.trades as object), created_at: (r.trades as { created_at: string }).created_at }));

  const posts = (likedPosts ?? [])
    .filter((r) => r.posts)
    .map((r) => ({ type: "post" as const, ...(r.posts as object), created_at: (r.posts as { created_at: string }).created_at }));

  const merged = [...trades, ...posts].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 30);

  return Response.json(merged);
}
