import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canModerate } from "@/lib/rooms";
import { NextRequest } from "next/server";

async function channelRoom(channelId: string) {
  const { data } = await supabaseAdmin
    .from("channels")
    .select("id, room_id")
    .eq("id", channelId)
    .maybeSingle();
  return data;
}

// PATCH /api/channels/:id — rename (owner/mod).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await channelRoom(id);
  if (!channel) return new Response("Not found", { status: 404 });
  if (!canModerate(await getMembership(channel.room_id, userId))) {
    return new Response("Forbidden", { status: 403 });
  }

  const { name } = await req.json();
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed.length > 32) return new Response("Name must be 1–32 characters", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("channels")
    .update({ name: trimmed })
    .eq("id", id)
    .select("id, name, slug, position")
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// DELETE /api/channels/:id — remove a channel (owner/mod). Refuses to
// delete a room's last remaining channel.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await channelRoom(id);
  if (!channel) return new Response("Not found", { status: 404 });
  if (!canModerate(await getMembership(channel.room_id, userId))) {
    return new Response("Forbidden", { status: 403 });
  }

  const { count } = await supabaseAdmin
    .from("channels")
    .select("*", { count: "exact", head: true })
    .eq("room_id", channel.room_id);
  if ((count ?? 0) <= 1) return new Response("A room must keep at least one channel", { status: 400 });

  await supabaseAdmin.from("channels").delete().eq("id", id);
  return Response.json({ ok: true });
}
