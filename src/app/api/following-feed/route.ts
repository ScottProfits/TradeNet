import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  // Get who the user follows
  const { data: follows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId);

  if (!follows || follows.length === 0) return Response.json({ trades: [], posts: [] });

  const followingIds = follows.map((f) => f.following_id);

  const [{ data: trades }, { data: posts }] = await Promise.all([
    supabase
      .from("trades")
      .select(`*, profiles!trades_user_id_fkey (id, handle, avatar_url, brokerage, verified)`)
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("posts")
      .select("*")
      .in("user_id", followingIds)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  // liked trades
  const tradeIds = (trades ?? []).map((t) => t.id);
  const postIds = (posts ?? []).map((p) => p.id);
  const userIds = [...new Set((posts ?? []).map((p) => p.user_id))];

  const [{ data: likes }, { data: postLikes }, { data: profiles }] = await Promise.all([
    tradeIds.length > 0
      ? supabase.from("likes").select("trade_id").eq("user_id", userId).in("trade_id", tradeIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? supabase.from("profiles").select("id, handle, avatar_url, verified").in("id", userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const likedSet = new Set((likes ?? []).map((l: { trade_id: string }) => l.trade_id));
  const postLikedSet = new Set((postLikes ?? []).map((l: { post_id: string }) => l.post_id));
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  return Response.json({
    trades: (trades ?? []).map((t) => ({ ...t, liked_by_me: likedSet.has(t.id) })),
    posts: (posts ?? []).map((p) => ({ ...p, profiles: profileMap[p.user_id] ?? null, liked_by_me: postLikedSet.has(p.id) })),
  });
}
