import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canModerate } from "@/lib/rooms";
import { NextRequest } from "next/server";

// PATCH /api/channel-messages/:id — edit message text. Author only.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: msg } = await supabaseAdmin
    .from("channel_messages")
    .select("id, sender_id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (!msg || msg.deleted_at) return new Response("Not found", { status: 404 });
  if (msg.sender_id !== userId) return new Response("You can only edit your own messages", { status: 403 });

  const { content } = await req.json();
  const trimmed = (content ?? "").trim();
  if (!trimmed) return new Response("Message can't be empty", { status: 400 });
  if (trimmed.length > 4000) return new Response("Message too long", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("channel_messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, content, edited_at")
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// DELETE /api/channel-messages/:id — soft-delete a message. Allowed for
// the author or a room owner/mod.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: msg } = await supabaseAdmin
    .from("channel_messages")
    .select("id, sender_id, channel_id")
    .eq("id", id)
    .maybeSingle();
  if (!msg) return new Response("Not found", { status: 404 });

  let allowed = msg.sender_id === userId;
  if (!allowed) {
    const { data: channel } = await supabaseAdmin
      .from("channels")
      .select("room_id")
      .eq("id", msg.channel_id)
      .single();
    allowed = !!channel && canModerate(await getMembership(channel.room_id, userId));
  }
  if (!allowed) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin
    .from("channel_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  return Response.json({ ok: true });
}
