import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const { userId } = await auth();
  // Cursor pagination for "load more" on the trade/post history — when
  // present, skip the profile/followers/following work below and return
  // just the next page (see loadMoreHistory in the profile page).
  const before = new URL(req.url).searchParams.get("before");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .single();

  if (error || !profile) return new Response("Not found", { status: 404 });

  const isOwner = userId === profile.id;
  let tradesQuery = supabase
    .from("trades")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!isOwner) tradesQuery = tradesQuery.eq("is_public", true);
  if (before) tradesQuery = tradesQuery.lt("created_at", before);

  const { data: tradesRaw } = await tradesQuery;

  let trades: Array<Record<string, unknown>> = tradesRaw ?? [];
  if (trades.length > 0) {
    const tradeIds = trades.map((t) => t.id as string);
    const { data: myTradeLikes } = userId
      ? await supabase.from("likes").select("trade_id").eq("user_id", userId).in("trade_id", tradeIds)
      : { data: [] };
    const tradeLikedSet = new Set((myTradeLikes ?? []).map((l: { trade_id: string }) => l.trade_id));
    trades = trades.map((t) => ({ ...t, liked_by_me: tradeLikedSet.has(t.id as string) }));
  }

  let postsQuery = supabase
    .from("posts")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (before) postsQuery = postsQuery.lt("created_at", before);

  const { data: postsRaw } = await postsQuery;

  let posts: Array<Record<string, unknown>> = postsRaw ?? [];
  if (posts.length > 0) {
    const postIds = posts.map((p) => p.id as string);
    const { data: myLikes } = userId
      ? await supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", postIds)
      : { data: [] };
    const likedSet = new Set((myLikes ?? []).map((l: { post_id: string }) => l.post_id));
    posts = posts.map((p) => ({
      ...p,
      profiles: { id: profile.id, handle: profile.handle, avatar_url: profile.avatar_url, verified: profile.verified },
      liked_by_me: likedSet.has(p.id as string),
    }));
  }

  if (before) return Response.json({ trades, posts });

  const { count: followersCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("following_id", profile.id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", profile.id);

  // Check if the current user already follows this profile
  let isFollowing = false;
  if (userId && userId !== profile.id) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", userId)
      .eq("following_id", profile.id)
      .single();
    isFollowing = !!followRow;
  }

  return Response.json({
    profile,
    trades: trades ?? [],
    posts,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
    isFollowing,
    isOwner,
  });
}
