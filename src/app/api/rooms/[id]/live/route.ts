import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate } from "@/lib/rooms";
import { NextRequest } from "next/server";

// GET /api/rooms/:id/live — which channels in this room are live right now.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return Response.json({ live: [] });
  if (!canParticipate(await getMembership(id, userId))) return Response.json({ live: [] });

  const { data } = await supabaseAdmin
    .from("channel_streams")
    .select("channel_id, last_seen_at")
    .eq("room_id", id)
    .eq("status", "live");

  const live = (data ?? [])
    .filter((s) => Date.now() - new Date(s.last_seen_at).getTime() < 45_000)
    .map((s) => s.channel_id);

  return Response.json({ live });
}
