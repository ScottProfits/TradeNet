import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const withUser = req.nextUrl.searchParams.get("with");
  const unreadOnly = req.nextUrl.searchParams.get("unread");

  if (unreadOnly) {
    const { count } = await supabaseAdmin
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("read", false);
    return Response.json({ count: count ?? 0 });
  }

  if (withUser) {
    const { data } = await supabaseAdmin
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${withUser}),and(sender_id.eq.${withUser},receiver_id.eq.${userId})`)
      .order("created_at", { ascending: true });

    await supabaseAdmin
      .from("messages")
      .update({ read: true })
      .eq("receiver_id", userId)
      .eq("sender_id", withUser);

    return Response.json(data ?? []);
  }

  // Conversation list — deduplicated by partner, with profile info
  const { data } = await supabaseAdmin
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (!data) return Response.json([]);

  // Deduplicate by partner
  const seen = new Set<string>();
  const convos = data.filter((m) => {
    const partner = m.sender_id === userId ? m.receiver_id : m.sender_id;
    if (seen.has(partner)) return false;
    seen.add(partner);
    return true;
  });

  // Fetch partner profiles
  const partnerIds = convos.map((m) => m.sender_id === userId ? m.receiver_id : m.sender_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, handle, avatar_url, verified")
    .in("id", partnerIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const result = convos.map((m) => {
    const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
    return { ...m, partner: profileMap[partnerId] ?? null };
  });

  return Response.json(result);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { receiverId, content } = await req.json();
  if (!receiverId || !content?.trim()) return new Response("Missing fields", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ sender_id: userId, receiver_id: receiverId, content: content.trim() })
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("handle, avatar_url, verified")
    .eq("id", userId)
    .single();

  // Push notification to receiver
  if (senderProfile) {
    void sendPushToUser(receiverId, {
      title: `💬 @${senderProfile.handle}`,
      body: content.trim().slice(0, 100),
      url: `/messages/${senderProfile.handle}`,
    });
  }

  return Response.json({ ...data, sender: senderProfile }, { status: 201 });
}
