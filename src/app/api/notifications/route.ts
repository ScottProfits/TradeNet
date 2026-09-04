import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabaseAdmin
    .from("notifications")
    .select(`
      *,
      actor:profiles!notifications_actor_id_fkey (handle, avatar_url, verified)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = data ?? [];

  // Attach channel name/slug for channel-join notifications.
  const roomIds = [...new Set(rows.map((r) => r.room_id).filter(Boolean))];
  if (roomIds.length) {
    const { data: rooms } = await supabaseAdmin.from("rooms").select("id, name, slug").in("id", roomIds);
    const map = Object.fromEntries((rooms ?? []).map((r) => [r.id, r]));
    for (const r of rows) if (r.room_id) r.room = map[r.room_id] ?? null;
  }

  return Response.json(rows);
}

export async function PATCH() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  await supabaseAdmin
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);

  return new Response("OK", { status: 200 });
}
