import { auth, currentUser } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { sendPushToUser } from "@/lib/push";
import { NextRequest } from "next/server";

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { commentId } = await req.json();

  const { data: comment } = await supabase
    .from("comments")
    .select("user_id, trade_id, post_id")
    .eq("id", commentId)
    .single();

  if (!comment) return new Response("Not found", { status: 404 });
  if (comment.user_id !== userId) return new Response("Forbidden", { status: 403 });

  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (!error && comment.trade_id) {
    await supabase.rpc("decrement_comments", { trade_id_input: comment.trade_id });
  }

  return new Response("OK", { status: 200 });
}

export async function GET(req: NextRequest) {
  const tradeId = req.nextUrl.searchParams.get("tradeId");
  const postId = req.nextUrl.searchParams.get("postId");

  if (!tradeId && !postId) return new Response("Missing tradeId or postId", { status: 400 });

  const query = supabase
    .from("comments")
    .select(`*, profiles!comments_user_id_fkey (handle, avatar_url, verified)`)
    .order("created_at", { ascending: true });

  if (tradeId) query.eq("trade_id", tradeId);
  if (postId) query.eq("post_id", postId);

  const { data } = await query;
  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { tradeId, postId, content, parentId } = await req.json();
  if (!content?.trim()) return new Response("Empty comment", { status: 400 });

  const { data: existing } = await supabase.from("profiles").select("id").eq("id", userId).single();
  if (!existing) {
    const user = await currentUser();
    if (user) {
      const handle = user.username || `user_${userId.slice(-6)}`;
      const full_name = [user.firstName, user.lastName].filter(Boolean).join(" ") || handle;
      await supabase.from("profiles").insert({ id: userId, handle, full_name, avatar_url: user.imageUrl });
    }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: userId,
      trade_id: tradeId ?? null,
      post_id: postId ?? null,
      content: content.trim(),
      parent_id: parentId ?? null,
    })
    .select(`*, profiles!comments_user_id_fkey (handle, avatar_url, verified)`)
    .single();

  if (error) return new Response(error.message, { status: 500 });

  if (tradeId) {
    await supabase.rpc("increment_comments", { trade_id_input: tradeId });
    const { data: trade } = await supabase.from("trades").select("user_id").eq("id", tradeId).single();
    const [{ data: actor }, { data: full }] = await Promise.all([
      supabase.from("profiles").select("handle").eq("id", userId).single(),
      supabase.from("trades").select("ticker, pnl").eq("id", tradeId).single(),
    ]);
    const snippet = content.trim().slice(0, 60) + (content.trim().length > 60 ? "…" : "");

    // Notify trade owner of comment (unless they wrote it)
    if (trade && trade.user_id !== userId) {
      await supabase.from("notifications").insert({ user_id: trade.user_id, type: "comment", actor_id: userId, trade_id: tradeId });
      if (actor) {
        void sendPushToUser(trade.user_id, {
          title: `💬 @${actor.handle} commented`,
          body: `"${snippet}" on your ${full?.ticker ?? ""} trade`,
          url: `/trade/${tradeId}`,
        });
      }
    }

    // Notify the parent comment author when someone replies to their comment
    if (parentId) {
      const { data: parentComment } = await supabase.from("comments").select("user_id").eq("id", parentId).single();
      if (parentComment && parentComment.user_id !== userId && parentComment.user_id !== trade?.user_id) {
        await supabase.from("notifications").insert({ user_id: parentComment.user_id, type: "comment", actor_id: userId, trade_id: tradeId });
        if (actor) {
          void sendPushToUser(parentComment.user_id, {
            title: `↩️ @${actor.handle} replied to you`,
            body: `"${snippet}"`,
            url: `/trade/${tradeId}`,
          });
        }
      }
    }
  }

  if (postId) {
    // Increment post comments_count
    const { data: post } = await supabase.from("posts").select("comments_count").eq("id", postId).single();
    if (post) await supabase.from("posts").update({ comments_count: (post.comments_count ?? 0) + 1 }).eq("id", postId);
  }

  return Response.json(data, { status: 201 });
}
