import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/products/:id — public storefront data for one product, plus
// whether the caller (if signed in) already has an active subscription.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();

  const { data: product } = await supabaseAdmin
    .from("products")
    .select("id, user_id, title, description, price_cents, active")
    .eq("id", id)
    .maybeSingle();
  if (!product || !product.active || !product.price_cents) {
    return new Response("Not found", { status: 404 });
  }

  const { data: seller } = await supabaseAdmin
    .from("profiles")
    .select("handle, full_name, avatar_url, verified")
    .eq("id", product.user_id)
    .maybeSingle();

  let subscribed = false;
  if (userId) {
    const { data: sub } = await supabaseAdmin
      .from("product_subscriptions")
      .select("status")
      .match({ product_id: id, user_id: userId })
      .maybeSingle();
    subscribed = sub?.status === "active";
  }

  return Response.json({ ...product, seller, subscribed, isOwner: userId === product.user_id });
}
