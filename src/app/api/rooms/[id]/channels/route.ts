import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canModerate, uniqueChannelSlug } from "@/lib/rooms";
import { NextRequest } from "next/server";

// POST /api/rooms/:id/channels — owner/mod adds a topic channel.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const membership = await getMembership(id, userId);
  if (!canModerate(membership)) return new Response("Forbidden", { status: 403 });

  const { name } = await req.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed.length > 32) return new Response("Name must be 1–32 characters", { status: 400 });

  const slug = await uniqueChannelSlug(id, trimmed);

  const { data: last } = await supabaseAdmin
    .from("channels")
    .select("position")
    .eq("room_id", id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabaseAdmin
    .from("channels")
    .insert({ room_id: id, name: trimmed, slug, position: (last?.position ?? -1) + 1 })
    .select("id, name, slug, position, mods_only_posts")
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
