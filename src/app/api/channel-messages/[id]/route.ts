import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canModerate } from "@/lib/rooms";
import { NextRequest } from "next/server";

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
