import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabaseAdmin
    .from("journal_entries")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return Response.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { title, content } = await req.json();
  if (!content?.trim()) return new Response("Content required", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("journal_entries")
    .insert({ user_id: userId, title: title?.trim() || null, content: content.trim() })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id, title, content } = await req.json();
  if (!id) return new Response("Missing id", { status: 400 });

  const { error } = await supabaseAdmin
    .from("journal_entries")
    .update({ title: title?.trim() || null, content: content?.trim(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response("OK");
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { id } = await req.json();
  await supabaseAdmin.from("journal_entries").delete().eq("id", id).eq("user_id", userId);
  return new Response("OK");
}
