import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership } from "@/lib/rooms";
import { NextRequest } from "next/server";

// POST /api/rooms/:id/join — join a FREE room immediately. Paid rooms
// return 402; the client sends the user to web Stripe Checkout and the
// membership row is created by the webhook instead.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id, price_cents")
    .eq("id", id)
    .maybeSingle();
  if (!room) return new Response("Not found", { status: 404 });

  const existing = await getMembership(room.id, userId);
  if (existing?.status === "banned") return new Response("You are banned from this channel", { status: 403 });
  if (existing?.status === "active") return Response.json({ status: "active" });

  if (room.price_cents && room.price_cents > 0) {
    return new Response("This channel requires a subscription", { status: 402 });
  }

  await supabaseAdmin.from("room_members").upsert(
    { room_id: room.id, user_id: userId, role: "member", status: "active" },
    { onConflict: "room_id,user_id" }
  );

  const { data: counts } = await supabaseAdmin.from("rooms").select("member_count").eq("id", room.id).single();
  await supabaseAdmin
    .from("rooms")
    .update({ member_count: (counts?.member_count ?? 0) + 1 })
    .eq("id", room.id);

  return Response.json({ status: "active" });
}

// DELETE /api/rooms/:id/join — leave a room. The owner cannot leave.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const membership = await getMembership(id, userId);
  if (!membership) return Response.json({ ok: true });
  if (membership.role === "owner") return new Response("The owner cannot leave their own channel", { status: 400 });

  await supabaseAdmin.from("room_members").delete().match({ room_id: id, user_id: userId });

  const { data } = await supabaseAdmin.from("rooms").select("member_count").eq("id", id).single();
  await supabaseAdmin
    .from("rooms")
    .update({ member_count: Math.max(0, (data?.member_count ?? 1) - 1) })
    .eq("id", id);

  // TODO(billing step): if this was a paid room, cancel the Stripe subscription here.
  return Response.json({ ok: true });
}
