import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canModerate } from "@/lib/rooms";
import { newSession, pushTracks, DAILY_STREAM_LIMIT_SECONDS } from "@/lib/realtime";
import { NextRequest } from "next/server";

// POST /api/channels/:id/stream/start
// Body: { offer: string (SDP), videoMid: string, audioMid?: string, title?: string, day: "YYYY-MM-DD" }
// Owner/mod only. Checks the broadcaster's daily budget, creates a Cloudflare
// Realtime session, pushes the screen (+ mic) tracks, returns the SFU answer.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: channel } = await supabaseAdmin
    .from("channels")
    .select("id, room_id")
    .eq("id", id)
    .maybeSingle();
  if (!channel) return new Response("Not found", { status: 404 });
  if (!canModerate(await getMembership(channel.room_id, userId))) {
    return new Response("Only channel admins can go live", { status: 403 });
  }

  const { offer, videoMid, audioMid, title, day } = await req.json();
  if (!offer || !videoMid || !day) return new Response("Missing offer/videoMid/day", { status: 400 });

  // Daily budget — total across every channel this user owns.
  const { data: usage } = await supabaseAdmin
    .from("stream_usage")
    .select("seconds")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  if ((usage?.seconds ?? 0) >= DAILY_STREAM_LIMIT_SECONDS) {
    return new Response("You've used your daily streaming time. Resets at midnight.", { status: 429 });
  }

  // One live stream per channel.
  const { data: existing } = await supabaseAdmin
    .from("channel_streams")
    .select("id")
    .eq("channel_id", id)
    .eq("status", "live")
    .maybeSingle();
  if (existing) return new Response("This channel is already live", { status: 409 });

  const sessionId = await newSession();
  const mids = [videoMid, ...(audioMid ? [audioMid] : [])];
  const pushed = await pushTracks(sessionId, offer, mids);

  const { data: stream, error } = await supabaseAdmin
    .from("channel_streams")
    .insert({
      channel_id: id,
      room_id: channel.room_id,
      broadcaster_id: userId,
      cf_session_id: sessionId,
      video_track: videoMid,
      audio_track: audioMid ?? null,
      title: (title ?? "").toString().slice(0, 120) || null,
    })
    .select("id")
    .single();
  if (error) return new Response(error.message, { status: 500 });

  return Response.json({
    streamId: stream.id,
    answer: (pushed.sessionDescription as { sdp: string } | undefined)?.sdp ?? null,
  });
}
