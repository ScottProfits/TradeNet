import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe, appUrl, platformFeePercent } from "@/lib/stripe";
import { getMembership } from "@/lib/rooms";
import { NextRequest } from "next/server";

// POST /api/rooms/:id/subscribe — start a web Checkout for a paid room.
// Returns { url } to redirect to. The membership row is created by the
// webhook on checkout.session.completed, not here.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: room } = await supabaseAdmin
    .from("rooms")
    .select("id, name, slug, price_cents, platform_fee_percent, stripe_price_id, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!room) return new Response("Not found", { status: 404 });
  if (!room.price_cents || !room.stripe_price_id) {
    return new Response("This room is free — just join it", { status: 400 });
  }
  if (room.owner_id === userId) return new Response("You own this room", { status: 400 });

  const existing = await getMembership(id, userId);
  if (existing?.status === "banned") return new Response("You are banned from this room", { status: 403 });
  if (existing?.status === "active") return new Response("Already a member", { status: 400 });

  const { data: creator } = await supabaseAdmin
    .from("creator_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", room.owner_id)
    .maybeSingle();
  if (!creator?.stripe_account_id || !creator.payouts_enabled) {
    return new Response("This room can't take payments right now", { status: 409 });
  }

  // Reuse (or create) the caller's Stripe Customer.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id, handle")
    .eq("id", userId)
    .single();

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const user = await currentUser();
    const customer = await stripe.customers.create({
      email: user?.emailAddresses?.[0]?.emailAddress,
      name: profile?.handle,
      metadata: { ryzr_user_id: userId },
    });
    customerId = customer.id;
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: room.stripe_price_id, quantity: 1 }],
    subscription_data: {
      application_fee_percent: platformFeePercent(room.platform_fee_percent),
      transfer_data: { destination: creator.stripe_account_id },
      metadata: { ryzr_room_id: id, ryzr_user_id: userId },
    },
    metadata: { ryzr_room_id: id, ryzr_user_id: userId },
    success_url: `${appUrl()}/rooms/${room.slug}?welcome=1`,
    cancel_url: `${appUrl()}/rooms/${room.slug}`,
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
