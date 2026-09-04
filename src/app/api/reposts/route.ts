import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

// GET /api/reposts            — recent reposts across the whole network (feed discovery)
// GET /api/reposts?handle=x   — a single user's reposts (their profile)
// GET /api/reposts?following=1 — reposts by people the viewer follows
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const handle = req.nextUrl.searchParams.get("handle");
  const followingOnly = req.nextUrl.searchParams.get("following") === "1";

  let reposterIds: string[] | null = null;

  if (handle) {
    const { data: prof } = await supabase.from("profiles").select("id").eq("handle", handle).maybeSingle();
    if (!prof) return Response.json([]);
    reposterIds = [prof.id];
  } else if (followingOnly) {
    if (!userId) return Response.json([]);
    const { data: follows } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
    reposterIds = (follows ?? []).map((f) => f.following_id);
    if (reposterIds.length === 0) return Response.json([]);
  }

  let q = supabaseAdmin
    .from("reposts")
    .select("id, user_id, target_type, target_id, created_at")
    .order("created_at", { ascending: false })
    .limit(40);
  if (reposterIds) q = q.in("user_id", reposterIds);

  const { data: reposts } = await q;
  if (!reposts || reposts.length === 0) return Response.json([]);

  const tradeIds = reposts.filter((r) => r.target_type === "trade").map((r) => r.target_id);
  const postIds = reposts.filter((r) => r.target_type === "post").map((r) => r.target_id);
  const reposterProfileIds = [...new Set(reposts.map((r) => r.user_id))];

  const [{ data: trades }, { data: posts }, { data: reposters }] = await Promise.all([
    tradeIds.length
      ? supabase
          .from("trades")
          .select(`*, profiles!trades_user_id_fkey (id, handle, avatar_url, brokerage, verified)`)
          .in("id", tradeIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabase.from("posts").select("*").in("id", postIds)
      : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("id, handle, avatar_url, verified").in("id", reposterProfileIds),
  ]);

  // posts don't carry a profiles join — attach the author manually
  const postAuthorIds = [...new Set((posts ?? []).map((p) => p.user_id))];
  const { data: postAuthors } = postAuthorIds.length
    ? await supabase.from("profiles").select("id, handle, avatar_url, verified").in("id", postAuthorIds)
    : { data: [] };
  const postAuthorMap = Object.fromEntries((postAuthors ?? []).map((p) => [p.id, p]));

  // viewer's likes
  let likedTradeIds = new Set<string>();
  let likedPostIds = new Set<string>();
  if (userId) {
    const [{ data: tl }, { data: pl }] = await Promise.all([
      supabase.from("likes").select("trade_id").eq("user_id", userId),
      supabase.from("post_likes").select("post_id").eq("user_id", userId),
    ]);
    likedTradeIds = new Set((tl ?? []).map((l) => l.trade_id));
    likedPostIds = new Set((pl ?? []).map((l) => l.post_id));
  }

  // Which of these targets the viewer has themselves reposted.
  const myTradeReposts = new Set<string>();
  const myPostReposts = new Set<string>();
  if (userId) {
    const { data: mine } = await supabaseAdmin
      .from("reposts")
      .select("target_type, target_id")
      .eq("user_id", userId);
    for (const m of mine ?? []) {
      if (m.target_type === "trade") myTradeReposts.add(m.target_id);
      else myPostReposts.add(m.target_id);
    }
  }

  const reposterMap = Object.fromEntries((reposters ?? []).map((p) => [p.id, p]));
  const tradeMap = Object.fromEntries((trades ?? []).map((t) => [t.id, t]));
  const postMap = Object.fromEntries((posts ?? []).map((p) => [p.id, p]));

  const items = reposts
    .map((r) => {
      const by = reposterMap[r.user_id];
      if (!by) return null;
      if (r.target_type === "trade") {
        const t = tradeMap[r.target_id];
        if (!t) return null;
        return {
          type: "trade" as const,
          repostId: r.id,
          repostedBy: by,
          repostedAt: r.created_at,
          ...t,
          liked_by_me: likedTradeIds.has(t.id),
          reposted_by_me: myTradeReposts.has(t.id),
        };
      }
      const p = postMap[r.target_id];
      if (!p) return null;
      return {
        type: "post" as const,
        repostId: r.id,
        repostedBy: by,
        repostedAt: r.created_at,
        ...p,
        profiles: postAuthorMap[p.user_id] ?? null,
        liked_by_me: likedPostIds.has(p.id),
        reposted_by_me: myPostReposts.has(p.id),
      };
    })
    .filter(Boolean);

  return Response.json(items);
}
