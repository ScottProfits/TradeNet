import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate } from "@/lib/rooms";
import { NextRequest } from "next/server";

// How long a typing ping stays "live" (client re-pings every ~3s).
const WINDOW_MS = 6000;

async function memberChannel(channelId: string, userId: string) {
  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("id, room_id")
    .eq("id", channelId)
    .maybeSingle();
  if (!channel) return null;
  return canParticipate(await getMembership(channel.room_id, userId)) ? channel : null;
}

// POST /api/channels/:id/typing — "I'm typing" ping.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!(await memberChannel(id, userId))) return new Response("Forbidden", { status: 403 });

  await supabaseAdmin
    .from("channel_typing")
    .upsert({ channel_id: id, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: "channel_id,user_id" });
  return new Response(null, { status: 204 });
}

// GET /api/channels/:id/typing — handles of others typing right now.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return Response.json([]);
  if (!(await memberChannel(id, userId))) return Response.json([]);

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data } = await supabaseAdmin
    .from("channel_typing")
    .select("user_id")
    .eq("channel_id", id)
    .gt("updated_at", since)
    .neq("user_id", userId)
    .limit(10);

  const ids = (data ?? []).map((r) => r.user_id);
  if (!ids.length) return Response.json([]);

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("handle")
    .in("id", ids);
  return Response.json((profiles ?? []).map((p) => p.handle));
}
