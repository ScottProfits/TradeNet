import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

// GET /api/posts/:id — one post (with author + liked_by_me), used by /post/[id]
// so notifications can open the exact post that was liked/commented on.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  const { id } = await params;
  const { data: post } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  if (!post) return new Response("Not found", { status: 404 });

  const [{ data: profile }, { data: myLike }] = await Promise.all([
    supabase.from("profiles").select("id, handle, avatar_url, verified").eq("id", post.user_id).maybeSingle(),
    userId
      ? supabase.from("post_likes").select("post_id").eq("user_id", userId).eq("post_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return Response.json({ ...post, profiles: profile ?? null, liked_by_me: !!myLike });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { data: post } = await supabase.from("posts").select("user_id").eq("id", id).single();
  if (!post) return new Response("Not found", { status: 404 });
  if (post.user_id !== userId) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin.from("posts").delete().eq("id", id);
  return new Response("OK", { status: 200 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return new Response("Content required", { status: 400 });

  const { data: post } = await supabase.from("posts").select("user_id").eq("id", id).single();
  if (!post) return new Response("Not found", { status: 404 });
  if (post.user_id !== userId) return new Response("Forbidden", { status: 403 });

  const { data: updated, error } = await supabaseAdmin
    .from("posts")
    .update({ content: content.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(updated);
}
