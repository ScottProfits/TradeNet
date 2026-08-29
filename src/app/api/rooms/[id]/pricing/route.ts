import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { getMembership } from "@/lib/rooms";
import { NextRequest } from "next/server";

// PATCH /api/rooms/:id/pricing { priceCents }
//   priceCents > 0  → paid room at that monthly price
//   priceCents 0/null → back to free
//
// We use Stripe destination charges, so the Product/Price live on the
// PLATFORM account and payouts are routed per-subscription. Prices are
// immutable, so a change archives the old Price and creates a new one;
// existing subscribers keep their current price until they resubscribe.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: room } = await supabaseAdmin.from("rooms").select("*").eq("id", id).maybeSingle();
  if (!room) return new Response("Not found", { status: 404 });

  const membership = await getMembership(id, userId);
  if (membership?.role !== "owner") return new Response("Only the owner can set pricing", { status: 403 });

  const { priceCents } = await req.json();
  const cents = Number.isFinite(priceCents) ? Math.round(priceCents) : 0;
  if (cents < 0 || cents > 100000) return new Response("Price must be $0–$1000", { status: 400 });

  if (cents > 0) {
    const { data: creator } = await supabaseAdmin
      .from("creator_accounts")
      .select("payouts_enabled")
      .eq("user_id", userId)
      .maybeSingle();
    if (!creator?.payouts_enabled) {
      return new Response("Connect payouts before charging for a room", { status: 402 });
    }
  }

  // Free: archive any existing Price, clear the columns.
  if (cents === 0) {
    if (room.stripe_price_id) {
      await stripe.prices.update(room.stripe_price_id, { active: false }).catch(() => {});
    }
    await supabaseAdmin
      .from("rooms")
      .update({ price_cents: null, stripe_price_id: null })
      .eq("id", id);
    return Response.json({ price_cents: null });
  }

  let productId = room.stripe_product_id as string | null;
  if (!productId) {
    const product = await stripe.products.create({
      name: `Ryzr room — ${room.name}`,
      metadata: { ryzr_room_id: id, ryzr_owner_id: userId },
    });
    productId = product.id;
  }

  if (room.stripe_price_id) {
    await stripe.prices.update(room.stripe_price_id, { active: false }).catch(() => {});
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: cents,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { ryzr_room_id: id },
  });

  await supabaseAdmin
    .from("rooms")
    .update({ price_cents: cents, stripe_product_id: productId, stripe_price_id: price.id })
    .eq("id", id);

  return Response.json({ price_cents: cents });
}
