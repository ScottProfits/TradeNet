import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate } from "@/lib/rooms";
import { NextRequest } from "next/server";

// Accept any short emoji-ish string — at least one non-ASCII code point,
// no letters/digits/whitespace, capped in length. Keeps it from becoming
// a free text field without hard-coding a list.
function isEmoji(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (!s || [...s].length > 8) return false;
  if (/[A-Za-z0-9\s]/.test(s)) return false;
  return /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}\u{20E3}\u{2764}]/u.test(s);
}

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
  if (!isEmoji(emoji)) return new Response("Unsupported reaction", { status: 400 });
  if (!(await guard(id, userId))) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin
    .from("channel_message_reactions")
    .upsert({ message_id: id, user_id: userId, emoji: emoji.trim() }, { onConflict: "message_id,user_id,emoji" });
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
