-- Indicator subscription access (semi-manual grant/revoke on TradingView).
-- Stripe is the source of truth for billing; this table just tracks who
-- needs their TradingView invite-only access granted or revoked, since
-- TradingView has no public API for that — an admin does it by hand from
-- the /admin/indicator-access page.

create table if not exists indicator_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,                 -- Clerk user id
  tv_username text not null,             -- TradingView username, from Stripe Checkout custom field
  status text not null default 'needs_grant'
    check (status in ('needs_grant', 'active', 'needs_revoke', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  granted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per (user, subscription) — a user re-subscribing after canceling
-- gets a fresh row via upsert on stripe_subscription_id.
create unique index if not exists indicator_subscriptions_sub_id_idx
  on indicator_subscriptions (stripe_subscription_id);

create index if not exists indicator_subscriptions_status_idx
  on indicator_subscriptions (status);

alter table indicator_subscriptions enable row level security;

-- Only the service role (via supabaseAdmin) reads/writes this table —
-- webhook, subscribe route, and the admin page all go through the server.
-- No public/anon policies are created on purpose.
