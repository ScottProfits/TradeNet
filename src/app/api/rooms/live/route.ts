import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/rooms/live — room ids the caller can see that have a live stream
// in one of their channels right now (for the LIVE badge on the rooms list).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ live: [] });

  const { data: streams } = await supabaseAdmin
    .from("channel_streams")
    .select("room_id, last_seen_at")
    .eq("status", "live");

  const recent = (streams ?? []).filter(
    (s) => Date.now() - new Date(s.last_seen_at).getTime() < 45_000
  );
  if (recent.length === 0) return Response.json({ live: [] });

  const roomIds = [...new Set(recent.map((s) => s.room_id))];
  const { data: mine } = await supabaseAdmin
    .from("room_members")
    .select("room_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("room_id", roomIds);

  return Response.json({ live: (mine ?? []).map((m) => m.room_id) });
}
