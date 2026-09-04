import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { closeTracks, DAILY_STREAM_LIMIT_SECONDS, STREAM_WARN_AT_SECONDS } from "@/lib/realtime";
import { NextRequest } from "next/server";

// POST /api/channels/:id/stream/heartbeat  Body: { day: "YYYY-MM-DD" }
// The broadcaster pings this every ~15s. It keeps the stream alive, adds the
// elapsed time to the user's daily budget, and kills the stream when the
// budget runs out. Returns how much time is left so the client can warn.
const TICK_SECONDS = 20; // credited per heartbeat (client sends ~every 15s)

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { day } = await req.json();
  if (!day) return new Response("Missing day", { status: 400 });

  const { data: stream } = await supabaseAdmin
    .from("channel_streams")
    .select("id, broadcaster_id, cf_session_id, video_track, audio_track, last_seen_at")
    .eq("channel_id", id)
    .eq("status", "live")
    .maybeSingle();
  if (!stream || stream.broadcaster_id !== userId) return new Response("No live stream", { status: 404 });

  // Credit real elapsed time since the last heartbeat (capped, so a paused
  // tab that resumes doesn't dump a huge chunk).
  const elapsed = Math.min(
    TICK_SECONDS * 2,
    Math.max(0, Math.round((Date.now() - new Date(stream.last_seen_at).getTime()) / 1000))
  );

  const { data: usage } = await supabaseAdmin
    .from("stream_usage")
    .select("seconds")
    .eq("user_id", userId)
    .eq("day", day)
    .maybeSingle();
  const seconds = (usage?.seconds ?? 0) + elapsed;

  await supabaseAdmin
    .from("stream_usage")
    .upsert({ user_id: userId, day, seconds }, { onConflict: "user_id,day" });
  await supabaseAdmin
    .from("channel_streams")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", stream.id);

  if (seconds >= DAILY_STREAM_LIMIT_SECONDS) {
    await supabaseAdmin
      .from("channel_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", stream.id);
    const tracks = [stream.video_track, stream.audio_track].filter(Boolean) as string[];
    if (tracks.length) await closeTracks(stream.cf_session_id, tracks).catch(() => {});
    return Response.json({ ended: true, reason: "daily-limit" });
  }

  return Response.json({
    ok: true,
    secondsUsed: seconds,
    secondsLeft: DAILY_STREAM_LIMIT_SECONDS - seconds,
    warn: seconds >= STREAM_WARN_AT_SECONDS,
  });
}
