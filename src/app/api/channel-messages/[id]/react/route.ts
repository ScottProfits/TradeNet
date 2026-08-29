import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate } from "@/lib/rooms";
import { NextRequest } from "next/server";

// A small allowlist keeps this from becoming a text field.
const EMOJI = ["👍", "🔥", "😂", "🚀", "💯", "👀", "❤️", "🎯"];

async function guard(messageId: string, userId: string) {
  const { data: msg } = await supabaseAdmin
    .from("channel_messages")
    .select("id, channel_id, deleted_at")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg || msg.deleted_at) return null;
  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("room_id")
    .eq("id", msg.channel_id)
    .single();
  if (!channel) return null;
  return canParticipate(await getMembership(channel.room_id, userId)) ? msg : null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { emoji } = await req.json();
  if (!EMOJI.includes(emoji)) return new Response("Unsupported reaction", { status: 400 });
  if (!(await guard(id, userId))) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin
    .from("channel_message_reactions")
    .upsert({ message_id: id, user_id: userId, emoji }, { onConflict: "message_id,user_id,emoji" });
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { emoji } = await req.json();
  await supabaseAdmin
    .from("channel_message_reactions")
    .delete()
    .match({ message_id: id, user_id: userId, emoji });
  return Response.json({ ok: true });
}
