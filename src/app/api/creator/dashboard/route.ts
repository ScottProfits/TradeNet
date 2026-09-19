import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

// POST /api/creator/dashboard — one-time login link into the caller's
// Stripe Express dashboard, where they view payouts and manage/update
// their payout bank account. Separate from the onboarding link: once an
// account is fully onboarded, an account_onboarding Account Link doesn't
// reliably surface bank details again.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const { data: acct } = await supabaseAdmin
    .from("creator_accounts")
    .select("stripe_account_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!acct?.stripe_account_id) {
    return new Response("Connect payouts first", { status: 400 });
  }

  const link = await stripe.accounts.createLoginLink(acct.stripe_account_id);
  return Response.json({ url: link.url });
}
