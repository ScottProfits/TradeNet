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

    const messageIds = (data ?? []).map((m) => m.id);
    const { data: likes } = messageIds.length
      ? await supabaseAdmin.from("message_likes").select("message_id, user_id").in("message_id", messageIds)
      : { data: [] };

    const likedByMap = new Map<string, string[]>();
    for (const l of likes ?? []) {
      likedByMap.set(l.message_id, [...(likedByMap.get(l.message_id) ?? []), l.user_id]);
    }

    const result = (data ?? []).map((m) => ({ ...m, liked_by: likedByMap.get(m.id) ?? [] }));
    return Response.json(result);
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

  const { receiverId, content, imageUrl } = await req.json();
  const trimmedContent = content?.trim() ?? "";
  if (!receiverId || (!trimmedContent && !imageUrl)) return new Response("Missing fields", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ sender_id: userId, receiver_id: receiverId, content: trimmedContent, image_url: imageUrl ?? null })
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
    const isVideo = imageUrl && /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(imageUrl);
    const fallbackBody = imageUrl ? (isVideo ? "🎥 Video" : "📷 Photo") : "";
    void sendPushToUser(receiverId, {
      title: `💬 @${senderProfile.handle}`,
      body: (trimmedContent || fallbackBody).slice(0, 100),
      url: `/messages/${senderProfile.handle}`,
    });
  }

  return Response.json({ ...data, sender: senderProfile }, { status: 201 });
}
