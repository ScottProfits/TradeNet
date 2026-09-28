import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe, appUrl } from "@/lib/stripe";

// GET /api/indicator/subscribe — the caller's own indicator subscription
// status, so /indicator can show the TradingView link once active.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabaseAdmin
    .from("indicator_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["needs_grant", "active"])
    .maybeSingle();

  return Response.json({ active: data?.status === "active" });
}

// POST /api/indicator/subscribe — start a web Checkout for the HTF Swings
// indicator's monthly access fee. Collects the buyer's TradingView username
// as a Checkout custom field (handy for support even though the script is
// Protected/public, not Invite-only, so nothing needs manual granting).
export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const priceId = process.env.STRIPE_INDICATOR_PRICE_ID;
  if (!priceId) return new Response("Indicator price not configured", { status: 500 });

  const { data: existing } = await supabaseAdmin
    .from("indicator_subscriptions")
    .select("status")
    .eq("user_id", userId)
    .in("status", ["needs_grant", "active"])
    .maybeSingle();
  if (existing) return new Response("Already subscribed", { status: 400 });

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
    line_items: [{ price: priceId, quantity: 1 }],
    custom_fields: [
      {
        key: "tv_username",
        label: { type: "custom", custom: "Your TradingView username" },
        type: "text",
        text: { minimum_length: 1, maximum_length: 64 },
      },
    ],
    subscription_data: {
      metadata: { ryzr_user_id: userId, kind: "indicator" },
    },
    metadata: { ryzr_user_id: userId, kind: "indicator" },
    success_url: `${appUrl()}/indicator?welcome=1`,
    cancel_url: `${appUrl()}/indicator`,
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
