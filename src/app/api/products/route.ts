import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe, platformFeePercent } from "@/lib/stripe";
import { NextRequest } from "next/server";

// GET /api/products — the caller's own product (or null if they haven't set one up).
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabaseAdmin.from("products").select("*").eq("user_id", userId).maybeSingle();
  return Response.json(data ?? null);
}

// PATCH /api/products { title, description, priceCents, deliveryInstructions }
//   priceCents > 0 → live at that monthly price (needs Connect payouts enabled)
//   priceCents 0/null → back to draft (unlisted, no active Price)
//
// Same pattern as room pricing: the Product/Price live on the PLATFORM
// account, payouts route per-subscription via destination charges. Prices
// are immutable, so a price change archives the old one and makes a new one.
export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { title, description, priceCents, deliveryInstructions } = await req.json();
  if (!title || !title.trim()) return new Response("Title is required", { status: 400 });

  const cents = Number.isFinite(priceCents) ? Math.round(priceCents) : 0;
  if (cents < 0 || cents > 100000) return new Response("Price must be $0–$1000", { status: 400 });

  const { data: existing } = await supabaseAdmin.from("products").select("*").eq("user_id", userId).maybeSingle();

  if (cents === 0) {
    if (existing?.stripe_price_id) {
      await stripe.prices.update(existing.stripe_price_id, { active: false }).catch(() => {});
    }
    const { data } = await supabaseAdmin
      .from("products")
      .upsert(
        {
          user_id: userId,
          title: title.trim(),
          description: description ?? null,
          delivery_instructions: deliveryInstructions ?? null,
          price_cents: null,
          stripe_price_id: null,
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();
    return Response.json(data);
  }

  const { data: creator } = await supabaseAdmin
    .from("creator_accounts")
    .select("payouts_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (!creator?.payouts_enabled) {
    return new Response("Connect payouts before you can charge for a product", { status: 402 });
  }

  let productId = existing?.stripe_product_id as string | null | undefined;
  if (!productId) {
    const product = await stripe.products.create({
      name: title.trim(),
      metadata: { ryzr_user_id: userId },
    });
    productId = product.id;
  } else if (existing?.title !== title.trim()) {
    await stripe.products.update(productId, { name: title.trim() }).catch(() => {});
  }

  if (existing?.stripe_price_id) {
    await stripe.prices.update(existing.stripe_price_id, { active: false }).catch(() => {});
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: cents,
    currency: "usd",
    recurring: { interval: "month" },
    metadata: { ryzr_user_id: userId },
  });

  const { data } = await supabaseAdmin
    .from("products")
    .upsert(
      {
        user_id: userId,
        title: title.trim(),
        description: description ?? null,
        delivery_instructions: deliveryInstructions ?? null,
        price_cents: cents,
        platform_fee_percent: existing?.platform_fee_percent ?? platformFeePercent(),
        stripe_product_id: productId,
        stripe_price_id: price.id,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  return Response.json(data);
}
