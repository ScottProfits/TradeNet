import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

function isVideo(url: string | null): boolean {
  return !!url && /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url);
}

export async function GET() {
  const { userId } = await auth();

  const [{ data: trades }, { data: posts }] = await Promise.all([
    supabase
      .from("trades")
      .select(`*, profiles!trades_user_id_fkey (id, handle, avatar_url, brokerage, verified)`)
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("posts")
      .select("*")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const videoTrades = (trades ?? []).filter((t) => isVideo(t.image_url));
  const videoPosts = (posts ?? []).filter((p) => isVideo(p.image_url));

  let likedTradeIds = new Set<string>();
  let likedPostIds = new Set<string>();
  if (userId) {
    const [{ data: tradeLikes }, { data: postLikes }] = await Promise.all([
      supabase.from("likes").select("trade_id").eq("user_id", userId),
      supabase.from("post_likes").select("post_id").eq("user_id", userId),
    ]);
    likedTradeIds = new Set((tradeLikes ?? []).map((l) => l.trade_id));
    likedPostIds = new Set((postLikes ?? []).map((l) => l.post_id));
  }

  if (videoPosts.length > 0) {
    const userIds = [...new Set(videoPosts.map((p) => p.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("id, handle, avatar_url, verified").in("id", userIds);
    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    for (const p of videoPosts) (p as { profiles?: unknown }).profiles = profileMap[p.user_id] ?? null;
  }

  const items = [
    ...videoTrades.map((t) => ({ type: "trade" as const, ...t, liked_by_me: likedTradeIds.has(t.id) })),
    ...videoPosts.map((p) => ({ type: "post" as const, ...p, liked_by_me: likedPostIds.has(p.id) })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return Response.json(items.slice(0, 50));
}
