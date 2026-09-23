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

  // Preview of the liked/commented item (thumbnail or text snippet) so each
  // notification shows what it's about and can open it.
  const tradeIds = [...new Set(rows.map((r) => r.trade_id).filter(Boolean))];
  const postIds = [...new Set(rows.map((r) => r.post_id).filter(Boolean))];
  const [{ data: trades }, { data: posts }] = await Promise.all([
    tradeIds.length
      ? supabaseAdmin.from("trades").select("id, ticker, pnl, image_url").in("id", tradeIds)
      : Promise.resolve({ data: [] }),
    postIds.length
      ? supabaseAdmin.from("posts").select("id, content, image_url, image_urls").in("id", postIds)
      : Promise.resolve({ data: [] }),
  ]);
  const tradeMap = Object.fromEntries((trades ?? []).map((t) => [t.id, t]));
  const postMap = Object.fromEntries((posts ?? []).map((p) => [p.id, p]));
  for (const r of rows) {
    if (r.trade_id && tradeMap[r.trade_id]) {
      const t = tradeMap[r.trade_id];
      r.preview = { kind: "trade", image: t.image_url ?? null, text: `$${t.ticker}`, pnl: t.pnl };
    } else if (r.post_id && postMap[r.post_id]) {
      const p = postMap[r.post_id];
      r.preview = { kind: "post", image: p.image_urls?.[0] ?? p.image_url ?? null, text: (p.content ?? "").slice(0, 60) };
    }
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
