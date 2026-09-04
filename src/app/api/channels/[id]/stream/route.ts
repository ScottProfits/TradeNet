import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate, canModerate } from "@/lib/rooms";
import { closeTracks } from "@/lib/realtime";
import { NextRequest } from "next/server";

async function channelRoom(channelId: string) {
  const { data } = await supabaseAdmin.from("channels").select("id, name, room_id").eq("id", channelId).maybeSingle();
  return data;
}

// GET /api/channels/:id/stream — is anyone live? (members only)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await channelRoom(id);
  if (!channel) return new Response("Not found", { status: 404 });
  if (!canParticipate(await getMembership(channel.room_id, userId))) {
    return new Response("Not a member", { status: 403 });
  }

  const { data: live } = await supabaseAdmin
    .from("channel_streams")
    .select("id, broadcaster_id, cf_session_id, video_track, audio_track, title, started_at, last_seen_at")
    .eq("channel_id", id)
    .eq("status", "live")
    .maybeSingle();

  if (!live) return Response.json({ live: false });

  // No Vercel-cron on Hobby — clean up a dead broadcaster lazily on read.
  if (Date.now() - new Date(live.last_seen_at).getTime() > 45_000) {
    await supabaseAdmin
      .from("channel_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", live.id);
    const tracks = [live.video_track, live.audio_track].filter(Boolean) as string[];
    if (tracks.length) await closeTracks(live.cf_session_id, tracks).catch(() => {});
    return Response.json({ live: false });
  }

  const { data: broadcaster } = await supabaseAdmin
    .from("profiles")
    .select("handle, avatar_url, verified")
    .eq("id", live.broadcaster_id)
    .single();

  return Response.json({
    live: true,
    streamId: live.id,
    cfSessionId: live.cf_session_id,
    videoTrack: live.video_track,
    audioTrack: live.audio_track,
    title: live.title,
    startedAt: live.started_at,
    isBroadcaster: live.broadcaster_id === userId,
    broadcaster: broadcaster ?? null,
  });
}

// DELETE /api/channels/:id/stream — end the live stream (broadcaster or a mod).
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const channel = await channelRoom(id);
  if (!channel) return new Response("Not found", { status: 404 });

  const { data: live } = await supabaseAdmin
    .from("channel_streams")
    .select("id, broadcaster_id, cf_session_id, video_track, audio_track, started_at")
    .eq("channel_id", id)
    .eq("status", "live")
    .maybeSingle();
  if (!live) return Response.json({ ok: true });

  const membership = await getMembership(channel.room_id, userId);
  if (live.broadcaster_id !== userId && !canModerate(membership)) {
    return new Response("Forbidden", { status: 403 });
  }

  await supabaseAdmin
    .from("channel_streams")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", live.id);

  const tracks = [live.video_track, live.audio_track].filter(Boolean) as string[];
  if (tracks.length) await closeTracks(live.cf_session_id, tracks).catch(() => {});

  return Response.json({ ok: true });
}
