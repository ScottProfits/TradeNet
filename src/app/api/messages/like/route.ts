import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { NextRequest } from "next/server";

async function getMessageIfRecipient(messageId: string, userId: string) {
  const { data: message } = await supabaseAdmin
    .from("messages")
    .select("sender_id, receiver_id, content")
    .eq("id", messageId)
    .single();
  if (!message || message.receiver_id !== userId) return null;
  return message;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { messageId } = await req.json();
  if (!messageId) return new Response("Missing messageId", { status: 400 });

  // Only the recipient of a message can like it — never the sender liking their own message
  const message = await getMessageIfRecipient(messageId, userId);
  if (!message) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin.from("message_likes").upsert(
    { message_id: messageId, user_id: userId },
    { onConflict: "message_id,user_id" }
  );

  const { data: actor } = await supabaseAdmin.from("profiles").select("handle").eq("id", userId).single();
  await supabaseAdmin.from("notifications").insert({
    user_id: message.sender_id,
    type: "message_like",
    actor_id: userId,
  });
  if (actor) {
    void sendPushToUser(message.sender_id, {
      title: "❤️ Message liked",
      body: `@${actor.handle} liked your message`,
      url: `/messages/${actor.handle}`,
    });
  }

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
