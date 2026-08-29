import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe, appUrl } from "@/lib/stripe";
import { NextRequest } from "next/server";

// POST /api/billing/portal { returnTo? } — Stripe billing portal link for
// the caller to update card / cancel any room subscription.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();
  if (!profile?.stripe_customer_id) return new Response("No billing account yet", { status: 404 });

  const { returnTo } = await req.json().catch(() => ({}));
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl()}${typeof returnTo === "string" && returnTo.startsWith("/") ? returnTo : "/rooms"}`,
  });

  return Response.json({ url: session.url });
}
