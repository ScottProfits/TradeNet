import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUser } from "@/lib/push";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/comment-likes?commentIds=id1,id2,...
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const ids = req.nextUrl.searchParams.get("commentIds")?.split(",").filter(Boolean) ?? [];
  if (!ids.length) return NextResponse.json({ counts: {}, liked: {} });

  const { data: counts } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .in("comment_id", ids);

  const countMap: Record<string, number> = {};
  const likedMap: Record<string, boolean> = {};
  ids.forEach((id) => { countMap[id] = 0; likedMap[id] = false; });
  counts?.forEach((r) => { countMap[r.comment_id] = (countMap[r.comment_id] ?? 0) + 1; });

  if (userId) {
    const { data: userLikes } = await supabase
      .from("comment_likes")
      .select("comment_id")
      .eq("user_id", userId)
      .in("comment_id", ids);
    userLikes?.forEach((r) => { likedMap[r.comment_id] = true; });
  }

  return NextResponse.json({ counts: countMap, liked: likedMap });
}

// POST /api/comment-likes  { commentId }
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { commentId } = await req.json();
  if (!commentId) return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

  const { data: existing } = await supabase
    .from("comment_likes")
    .select("id")
    .eq("user_id", userId)
    .eq("comment_id", commentId)
    .single();

  if (existing) {
    await supabase.from("comment_likes").delete().eq("user_id", userId).eq("comment_id", commentId);
    return NextResponse.json({ liked: false });
  } else {
    await supabase.from("comment_likes").insert({ user_id: userId, comment_id: commentId });

    const { data: comment } = await supabase.from("comments").select("user_id, trade_id, post_id").eq("id", commentId).single();
    if (comment && comment.user_id !== userId) {
      const { data: actor } = await supabase.from("profiles").select("handle").eq("id", userId).single();
      await supabase.from("notifications").insert({
        user_id: comment.user_id,
        type: "comment_like",
        actor_id: userId,
        trade_id: comment.trade_id,
        post_id: comment.post_id,
      });
      if (actor) {
        void sendPushToUser(comment.user_id, {
          title: "❤️ New like",
          body: `@${actor.handle} liked your comment`,
          url: comment.trade_id ? `/trade/${comment.trade_id}` : "/feed",
        });
      }
    }

    return NextResponse.json({ liked: true });
  }
}
