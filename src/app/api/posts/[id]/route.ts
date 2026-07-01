import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const { data: post } = await supabase.from("posts").select("user_id").eq("id", id).single();
  if (!post) return new Response("Not found", { status: 404 });
  if (post.user_id !== userId) return new Response("Forbidden", { status: 403 });

  await supabase.from("posts").delete().eq("id", id);
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

  const { data: updated, error } = await supabase
    .from("posts")
    .update({ content: content.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(updated);
}
