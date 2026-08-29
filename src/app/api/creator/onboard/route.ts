import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe, appUrl } from "@/lib/stripe";

// GET /api/creator/onboard — current Stripe Connect status for the caller.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: acct } = await supabaseAdmin
    .from("creator_accounts")
    .select("stripe_account_id, onboarding_complete, payouts_enabled")
    .eq("user_id", userId)
    .maybeSingle();

  if (!acct?.stripe_account_id) {
    return Response.json({ connected: false, payoutsEnabled: false });
  }

  // Re-check with Stripe so we reflect verification that finished on their side.
  const account = await stripe.accounts.retrieve(acct.stripe_account_id);
  const payoutsEnabled = !!account.payouts_enabled && !!account.charges_enabled;
  if (payoutsEnabled !== acct.payouts_enabled || !acct.onboarding_complete) {
    await supabaseAdmin
      .from("creator_accounts")
      .update({ payouts_enabled: payoutsEnabled, onboarding_complete: account.details_submitted })
      .eq("user_id", userId);
  }

  return Response.json({
    connected: true,
    payoutsEnabled,
    detailsSubmitted: account.details_submitted,
  });
}

// POST /api/creator/onboard — create the Express account if needed and
// return a fresh onboarding link.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  let { data: acct } = await supabaseAdmin
    .from("creator_accounts")
    .select("stripe_account_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!acct?.stripe_account_id) {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
      business_type: "individual",
      metadata: { ryzr_user_id: userId },
    });
    await supabaseAdmin
      .from("creator_accounts")
      .upsert({ user_id: userId, stripe_account_id: account.id }, { onConflict: "user_id" });
    acct = { stripe_account_id: account.id };
  }

  const link = await stripe.accountLinks.create({
    account: acct.stripe_account_id,
    refresh_url: `${appUrl()}/settings/earnings?refresh=1`,
    return_url: `${appUrl()}/settings/earnings?done=1`,
    type: "account_onboarding",
  });

  return Response.json({ url: link.url });
}
