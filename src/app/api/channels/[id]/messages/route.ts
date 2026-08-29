import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendPushToUser } from "@/lib/push";
import { getMembership, canParticipate, canModerate } from "@/lib/rooms";
import { NextRequest } from "next/server";

const PAGE = 30;

async function loadChannel(channelId: string) {
  const { data } = await supabaseAdmin
    .from("channels")
    .select("id, name, room_id, mods_only_posts")
    .eq("id", channelId)
    .maybeSingle();
  return data;
}

async function hydrate(rows: { sender_id: string }[]) {
  const senderIds = [...new Set(rows.map((r) => r.sender_id))];
  if (!senderIds.length) return {};
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, handle, avatar_url, verified")
    .in("id", senderIds);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p]));
}

// GET /api/channels/:id/messages           — newest PAGE messages (asc)
// GET /api/channels/:id/messages?before=ts  — the PAGE before that cursor
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await loadChannel(id);
  if (!channel) return new Response("Not found", { status: 404 });

  const membership = await getMembership(channel.room_id, userId);
  if (!canParticipate(membership)) return new Response("Not a member", { status: 403 });

  const before = req.nextUrl.searchParams.get("before");

  let query = supabaseAdmin
    .from("channel_messages")
    .select("id, channel_id, sender_id, content, image_url, poster_url, created_at, edited_at")
    .eq("channel_id", id)
    .is("deleted_at", null) // deleted messages disappear entirely
    .order("created_at", { ascending: false })
    .limit(PAGE);
  if (before) query = query.lt("created_at", before);

  const { data } = await query;
  const rows = (data ?? []).reverse(); // return chronological
  const ids = rows.map((r) => r.id);

  const [profileMap, { data: blocks }, { data: reactions }] = await Promise.all([
    hydrate(rows),
    supabaseAdmin.from("user_blocks").select("blocked_id").eq("blocker_id", userId),
    ids.length
      ? supabaseAdmin.from("channel_message_reactions").select("message_id, user_id, emoji").in("message_id", ids)
      : Promise.resolve({ data: [] as { message_id: string; user_id: string; emoji: string }[] }),
  ]);
  const blockedSet = new Set((blocks ?? []).map((b) => b.blocked_id));

  // { messageId: { emoji: { count, mine } } }
  const reactionMap = new Map<string, Record<string, { count: number; mine: boolean }>>();
  for (const r of reactions ?? []) {
    const forMsg = reactionMap.get(r.message_id) ?? {};
    const cur = forMsg[r.emoji] ?? { count: 0, mine: false };
    cur.count += 1;
    if (r.user_id === userId) cur.mine = true;
    forMsg[r.emoji] = cur;
    reactionMap.set(r.message_id, forMsg);
  }

  const result = rows.map((m) => ({
    ...m,
    hidden: blockedSet.has(m.sender_id),
    reactions: reactionMap.get(m.id) ?? {},
    sender: profileMap[m.sender_id] ?? null,
  }));

  return Response.json({ messages: result, hasMore: (data?.length ?? 0) === PAGE });
}

// POST /api/channels/:id/messages — send a message (active members only).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await loadChannel(id);
  if (!channel) return new Response("Not found", { status: 404 });

  const membership = await getMembership(channel.room_id, userId);
  if (!canParticipate(membership)) return new Response("Not a member", { status: 403 });
  if (channel.mods_only_posts && !canModerate(membership)) {
    return new Response("Only channel admins can post in this topic", { status: 403 });
  }

  const { content, imageUrl, posterUrl } = await req.json();
  const trimmed = (content ?? "").trim();
  if (!trimmed && !imageUrl) return new Response("Empty message", { status: 400 });
  if (trimmed.length > 4000) return new Response("Message too long", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("channel_messages")
    .insert({
      channel_id: id,
      sender_id: userId,
      content: trimmed,
      image_url: imageUrl ?? null,
      poster_url: posterUrl ?? null,
    })
    .select("id, channel_id, sender_id, content, image_url, poster_url, created_at")
    .single();
  if (error) return new Response(error.message, { status: 500 });

  const { data: sender } = await supabaseAdmin
    .from("profiles")
    .select("handle, avatar_url, verified")
    .eq("id", userId)
    .single();

  // Fan out a push to the rest of the room. Kept simple for now: all
  // active members minus the sender. A per-user mute/preference pass and
  // batching can come later if rooms get large.
  void notifyRoom(channel.room_id, channel.id, userId, sender?.handle ?? "someone", trimmed || "📷 Photo", channel.name);

  return Response.json({ ...data, deleted: false, sender: sender ?? null }, { status: 201 });
}

async function notifyRoom(
  roomId: string,
  channelId: string,
  senderId: string,
  senderHandle: string,
  preview: string,
  channelName: string
) {
  const { data: members } = await supabaseAdmin
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("status", "active");
  const { data: room } = await supabaseAdmin.from("rooms").select("slug").eq("id", roomId).single();

  for (const m of members ?? []) {
    if (m.user_id === senderId) continue;
    void sendPushToUser(m.user_id, {
      title: `#${channelName} · @${senderHandle}`,
      body: preview.slice(0, 100),
      url: room ? `/rooms/${room.slug}?c=${channelId}` : "/rooms",
    });
  }
}
