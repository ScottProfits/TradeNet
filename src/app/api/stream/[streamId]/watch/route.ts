import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate } from "@/lib/rooms";
import { newSession, pullTracks, renegotiate } from "@/lib/realtime";
import { NextRequest } from "next/server";

async function streamForViewer(streamId: string, userId: string) {
  const { data: stream } = await supabaseAdmin
    .from("channel_streams")
    .select("id, room_id, cf_session_id, video_track, audio_track, status")
    .eq("id", streamId)
    .maybeSingle();
  if (!stream || stream.status !== "live") return null;
  if (!canParticipate(await getMembership(stream.room_id, userId))) return null;
  return stream;
}

// POST /api/stream/:streamId/watch — start watching. Creates a viewer SFU
// session, pulls the broadcaster's track(s); Cloudflare returns an offer the
// client answers via PUT.
export async function POST(req: NextRequest, { params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const stream = await streamForViewer(streamId, userId);
  if (!stream) return new Response("Stream not available", { status: 403 });

  const trackNames = [stream.video_track, stream.audio_track].filter(Boolean) as string[];
  const viewerSessionId = await newSession();
  const pulled = await pullTracks(viewerSessionId, null, {
    sessionId: stream.cf_session_id,
    trackNames,
  });

  return Response.json({
    viewerSessionId,
    offer: (pulled.sessionDescription as { sdp: string } | undefined)?.sdp ?? null,
  });
}

// PUT /api/stream/:streamId/watch  Body: { viewerSessionId, answer }
// Sends the viewer's SDP answer back to Cloudflare.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const stream = await streamForViewer(streamId, userId);
  if (!stream) return new Response("Stream not available", { status: 403 });

  const { viewerSessionId, answer } = await req.json();
  if (!viewerSessionId || !answer) return new Response("Missing viewerSessionId/answer", { status: 400 });

  await renegotiate(viewerSessionId, answer, "answer");
  return Response.json({ ok: true });
}
