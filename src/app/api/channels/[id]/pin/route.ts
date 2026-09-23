import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate, canManageChannel } from "@/lib/rooms";
import { NextRequest } from "next/server";

async function loadChannel(id: string) {
  const { data } = await supabaseAdmin.from("channels").select("id, room_id").eq("id", id).maybeSingle();
  return data;
}

// GET /api/channels/:id/pin — the pinned message for this topic (or null).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await loadChannel(id);
  if (!channel) return new Response("Not found", { status: 404 });
  if (!canParticipate(await getMembership(channel.room_id, userId))) {
    return new Response("Not a member", { status: 403 });
  }

  // Column may not exist until the pin migration is run — treat as "no pin".
  const { data: row, error } = await supabaseAdmin
    .from("channels")
    .select("pinned_message_id")
    .eq("id", id)
    .maybeSingle();
  if (error || !row?.pinned_message_id) return Response.json({ message: null });

  const { data: msg } = await supabaseAdmin
    .from("channel_messages")
    .select("id, sender_id, content, image_url, poster_url, created_at")
    .eq("id", row.pinned_message_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!msg) return Response.json({ message: null });

  const { data: sender } = await supabaseAdmin
    .from("profiles")
    .select("handle, avatar_url, verified")
    .eq("id", msg.sender_id)
    .maybeSingle();
  return Response.json({ message: { ...msg, sender: sender ?? null } });
}

// POST /api/channels/:id/pin { messageId } — owner pins a message (replaces any current pin).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await loadChannel(id);
  if (!channel) return new Response("Not found", { status: 404 });
  if (!canManageChannel(await getMembership(channel.room_id, userId))) {
    return new Response("Only the channel owner can pin", { status: 403 });
  }

  const { messageId } = await req.json();
  if (!messageId) return new Response("Missing messageId", { status: 400 });
  const { data: msg } = await supabaseAdmin
    .from("channel_messages")
    .select("id")
    .eq("id", messageId)
    .eq("channel_id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!msg) return new Response("Message not found", { status: 404 });

  const { error } = await supabaseAdmin.from("channels").update({ pinned_message_id: messageId }).eq("id", id);
  if (error) return new Response("Pinning isn't set up yet — run the pin migration.", { status: 500 });
  return Response.json({ ok: true });
}

// DELETE /api/channels/:id/pin — owner unpins.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await loadChannel(id);
  if (!channel) return new Response("Not found", { status: 404 });
  if (!canManageChannel(await getMembership(channel.room_id, userId))) {
    return new Response("Only the channel owner can unpin", { status: 403 });
  }
  await supabaseAdmin.from("channels").update({ pinned_message_id: null }).eq("id", id);
  return Response.json({ ok: true });
}
