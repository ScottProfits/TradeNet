import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe, appUrl, platformFeePercent } from "@/lib/stripe";
import { NextRequest } from "next/server";

// POST /api/products/:id/subscribe — start a web Checkout for someone
// else's paid product. The subscription row is created by the webhook on
// checkout.session.completed, not here.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: product } = await supabaseAdmin.from("products").select("*").eq("id", id).maybeSingle();
  if (!product || !product.active || !product.price_cents || !product.stripe_price_id) {
    return new Response("Not available", { status: 404 });
  }
  if (product.user_id === userId) return new Response("You own this product", { status: 400 });

  const { data: existing } = await supabaseAdmin
    .from("product_subscriptions")
    .select("status")
    .match({ product_id: id, user_id: userId })
    .maybeSingle();
  if (existing?.status === "active") return new Response("Already subscribed", { status: 400 });

  const { data: creator } = await supabaseAdmin
    .from("creator_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", product.user_id)
    .maybeSingle();
  if (!creator?.stripe_account_id || !creator.payouts_enabled) {
    return new Response("This product can't take payments right now", { status: 409 });
  }

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
    line_items: [{ price: product.stripe_price_id, quantity: 1 }],
    subscription_data: {
      application_fee_percent: platformFeePercent(product.platform_fee_percent),
      transfer_data: { destination: creator.stripe_account_id },
      metadata: { ryzr_product_id: id, ryzr_user_id: userId, kind: "product" },
    },
    metadata: { ryzr_product_id: id, ryzr_user_id: userId, kind: "product" },
    success_url: `${appUrl()}/products/${id}/thanks`,
    cancel_url: `${appUrl()}/products/${id}`,
    allow_promotion_codes: true,
  });

  return Response.json({ url: session.url });
}
