import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { postId } = await req.json();
  if (!postId) return new Response("Missing postId", { status: 400 });

  const { error } = await supabase.from("post_likes").insert({ user_id: userId, post_id: postId });
  if (!error) {
    const { data: post } = await supabase.from("posts").select("likes_count").eq("id", postId).single();
    if (post) await supabase.from("posts").update({ likes_count: (post.likes_count ?? 0) + 1 }).eq("id", postId);
  }

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { postId } = await req.json();

  await supabase.from("post_likes").delete().match({ user_id: userId, post_id: postId });
  const { data: post } = await supabase.from("posts").select("likes_count").eq("id", postId).single();
  if (post) await supabase.from("posts").update({ likes_count: Math.max(0, (post.likes_count ?? 0) - 1) }).eq("id", postId);

  return new Response("OK", { status: 200 });
}
