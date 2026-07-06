import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

async function assertParticipant(messageId: string, userId: string) {
  const { data: message } = await supabaseAdmin
    .from("messages")
    .select("sender_id, receiver_id")
    .eq("id", messageId)
    .single();
  if (!message) return false;
  return message.sender_id === userId || message.receiver_id === userId;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messageId } = await req.json();
  if (!messageId) return new Response("Missing messageId", { status: 400 });
  if (!(await assertParticipant(messageId, userId))) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin.from("message_likes").upsert(
    { message_id: messageId, user_id: userId },
    { onConflict: "message_id,user_id" }
  );

  return new Response("OK", { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messageId } = await req.json();
  if (!messageId) return new Response("Missing messageId", { status: 400 });

  await supabaseAdmin.from("message_likes").delete().match({ message_id: messageId, user_id: userId });
  return new Response("OK", { status: 200 });
}
