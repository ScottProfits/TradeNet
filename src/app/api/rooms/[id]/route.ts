import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getMembership, canParticipate, canModerate } from "@/lib/rooms";
import { NextRequest } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadRoom(idOrSlug: string) {
  const column = UUID_RE.test(idOrSlug) ? "id" : "slug";
  const { data } = await supabaseAdmin.from("rooms").select("*").eq(column, idOrSlug).maybeSingle();
  return data;
}

// GET /api/rooms/:idOrSlug — room detail, its channels, and the caller's
// membership. Non-members get the public preview (channels list, but the
// client shows a join/subscribe wall instead of messages).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();

  const room = await loadRoom(id);
  if (!room) return new Response("Not found", { status: 404 });

  const [{ data: channels }, { data: owner }] = await Promise.all([
    supabaseAdmin
      .from("channels")
      .select("id, name, slug, position, mods_only_posts")
      .eq("room_id", room.id)
      .order("position", { ascending: true }),
    supabaseAdmin
      .from("profiles")
      .select("id, handle, avatar_url, verified")
      .eq("id", room.owner_id)
      .single(),
  ]);

  const membership = userId ? await getMembership(room.id, userId) : null;

  return Response.json({
    room: { ...room, owner: owner ?? null },
    channels: channels ?? [],
    membership,
    canParticipate: canParticipate(membership),
  });
}

// PATCH /api/rooms/:id — owner/mod edits room metadata. price_cents is
// intentionally NOT editable here; it's handled by the billing step so
// Stripe product/price stay in sync.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const room = await loadRoom(id);
  if (!room) return new Response("Not found", { status: 404 });

  const membership = await getMembership(room.id, userId);
  if (!canModerate(membership)) return new Response("Forbidden", { status: 403 });

  const body = await req.json();
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 60);
  if (typeof body.description === "string") patch.description = body.description.trim() || null;
  if (typeof body.avatarUrl === "string") patch.avatar_url = body.avatarUrl || null;
  if (body.visibility === "public" || body.visibility === "unlisted") patch.visibility = body.visibility;
  if (typeof body.showOnProfile === "boolean") patch.show_on_profile = body.showOnProfile;
  if (!Object.keys(patch).length) return new Response("Nothing to update", { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .update(patch)
    .eq("id", room.id)
    .select()
    .single();
  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// DELETE /api/rooms/:id — permanently delete a channel and everything in
// it. Owner only. FK cascades remove channels, members, messages,
// reactions, typing rows.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const room = await loadRoom(id);
  if (!room) return new Response("Not found", { status: 404 });

  const membership = await getMembership(room.id, userId);
  if (membership?.role !== "owner") return new Response("Only the owner can delete a channel", { status: 403 });

  const { count } = await supabaseAdmin
    .from("room_members")
    .select("*", { count: "exact", head: true })
    .eq("room_id", room.id)
    .eq("status", "active")
    .neq("user_id", userId);
  if (room.price_cents && (count ?? 0) > 0) {
    return new Response("Cancel all paid memberships before deleting this channel", { status: 409 });
  }

  // Best-effort: retire the Stripe price/product.
  if (room.stripe_price_id || room.stripe_product_id) {
    try {
      const { stripe } = await import("@/lib/stripe");
      if (room.stripe_price_id) await stripe.prices.update(room.stripe_price_id, { active: false });
      if (room.stripe_product_id) await stripe.products.update(room.stripe_product_id, { active: false });
    } catch {
      /* ignore — Stripe not configured or already retired */
    }
  }

  const { error } = await supabaseAdmin.from("rooms").delete().eq("id", room.id);
  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ ok: true });
}
