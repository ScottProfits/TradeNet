-- Run this in the Supabase SQL editor ONLY after you've flipped the Vercel
-- env vars over to your LIVE Stripe keys (see the go-live checklist).
--
-- Test-mode Stripe IDs (customers, products, prices, subscriptions,
-- Connect accounts) don't exist in live mode and will make checkout,
-- the billing portal, and the webhook error out. Everything wiped here
-- is auto-recreated by the app the next time it's needed:
--   - profiles.stripe_customer_id      -> recreated on next checkout
--   - rooms.stripe_product_id/price_id -> recreated next time the owner
--                                          saves a price in Manage
--   - creator_accounts.stripe_account_id -> recreated on next Connect
--                                            onboarding click
--   - room_members with a stripe_subscription_id -> these were test
--     subscriptions; they aren't real paying members, so drop them
--     back to free/removed rather than leaving a fake "active" status.

update public.profiles
set stripe_customer_id = null
where stripe_customer_id is not null;

update public.rooms
set stripe_product_id = null, stripe_price_id = null
where stripe_product_id is not null or stripe_price_id is not null;

update public.creator_accounts
set stripe_account_id = null, onboarding_complete = false, payouts_enabled = false
where stripe_account_id is not null;

-- Test-mode paid memberships: remove them so nobody is left with a
-- phantom "active" paid membership backed by a subscription that only
-- exists in test mode. Free (never-paid) members are untouched.
delete from public.room_members
where stripe_subscription_id is not null;

-- Idempotency log for the webhook — safe to clear, it just prevents
-- double-processing the same event id.
truncate table public.stripe_events;
