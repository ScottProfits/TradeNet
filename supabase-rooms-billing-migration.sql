-- Run in the Supabase SQL editor AFTER supabase-rooms-migration.sql.
-- Billing (Stripe Connect, web-only checkout) additions.

-- One Stripe Customer per user, reused across every room they subscribe to
-- and for the billing portal.
alter table public.profiles
  add column if not exists stripe_customer_id text;

-- Idempotency guard for the Stripe webhook.
create table if not exists public.stripe_events (
  id text primary key,
  type text,
  received_at timestamp with time zone default now()
);
alter table public.stripe_events enable row level security;
