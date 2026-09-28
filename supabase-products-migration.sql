-- Self-serve products: any user with Connect payouts enabled (see
-- creator_accounts, already used for paid channels) can set up one paid
-- product/service, priced monthly, sold through Ryzr with a platform cut —
-- same destination-charge pattern as paid channels. The buyer sees
-- `delivery_instructions` right after paying (how they actually get the
-- thing — a link, a DM, adding a TradingView username, etc).

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,          -- Clerk user id of the seller — one product per user for now
  title text not null,
  description text,
  price_cents int,                        -- null/0 = draft, not yet for sale
  platform_fee_percent numeric not null default 4.5,
  stripe_product_id text,
  stripe_price_id text,
  delivery_instructions text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_subscriptions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id text not null,                  -- Clerk user id of the buyer
  status text not null check (status in ('active', 'past_due', 'canceled')),
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create index if not exists product_subscriptions_user_idx on product_subscriptions (user_id);
create index if not exists product_subscriptions_product_idx on product_subscriptions (product_id);

alter table products enable row level security;
alter table product_subscriptions enable row level security;

-- Public read of active, priced products (storefront page); everything else
-- goes through the server with supabaseAdmin.
create policy "Public can read active products" on products
  for select using (active and price_cents is not null and price_cents > 0);
