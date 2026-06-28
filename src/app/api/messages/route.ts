import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { NextRequest } from "next/server";

// GET /api/messages?with=<userId> — fetch thread, or GET /api/messages — fetch conversations
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const withUser = req.nextUrl.searchParams.get("with");

  if (withUser) {
    // Fetch thread between current user and withUser
    const { data } = await supabase
      .from("messages")
      .select("*, sender:profiles!messages_sender_id_fkey(handle, avatar_url, verified)")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${withUser}),and(sender_id.eq.${withUser},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    // Mark received messages as read
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", userId)
      .eq("sender_id", withUser);

    return Response.json(data ?? []);
  }

  // Return conversation list — latest message per conversation partner
  const { data } = await supabase
    .from("messages")
    .select("*, sender:profiles!messages_sender_id_fkey(id, handle, avatar_url, verified), receiver:profiles!messages_receiver_id_fkey(id, handle, avatar_url, verified)")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!data) return Response.json([]);

  // Deduplicate — one entry per partner
  const seen = new Set<string>();
  const conversations = data.filter((m) => {
    const partner = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (seen.has(partner)) return false;
    seen.add(partner);
    return true;
  });

  return Response.json(conversations);
}

// POST /api/messages — send a message
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { receiverId, content } = await req.json();
  if (!receiverId || !content?.trim()) return new Response("Missing fields", { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: userId, receiver_id: receiverId, content: content.trim() })
    .select("*, sender:profiles!messages_sender_id_fkey(handle, avatar_url, verified)")
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data, { status: 201 });
}
