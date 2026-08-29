-- Run this in your Supabase SQL editor.
--
-- Premium chat: creator-monetized rooms, each containing topic channels.
-- Rooms are free (price_cents null/0) or paid (monthly subscription via
-- Stripe Connect — wired in a later migration/step). All access goes
-- through the API using the service-role client; RLS stays on with no
-- permissive policies, matching the 2026-07-06 lockdown.

-- ── Rooms ────────────────────────────────────────────────────────────
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text unique not null,
  description text,
  avatar_url text,
  price_cents integer,                       -- null or 0 => free room
  platform_fee_percent numeric not null default 4.5,
  stripe_product_id text,
  stripe_price_id text,
  member_count integer not null default 1,
  visibility text not null default 'public'
    check (visibility in ('public', 'unlisted')),
  created_at timestamp with time zone default now()
);
create index if not exists rooms_owner_idx on public.rooms (owner_id);

-- ── Channels (topic sub-rooms inside a room) ─────────────────────────
create table if not exists public.channels (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  created_at timestamp with time zone default now(),
  unique (room_id, slug)
);
create index if not exists channels_room_idx on public.channels (room_id, position);

-- ── Membership / entitlement ────────────────────────────────────────
-- status is the single source of truth for "can this user read/post".
-- Free rooms: row created on join. Paid rooms: row created/updated by
-- the Stripe webhook (later step).
create table if not exists public.room_members (
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'mod', 'member')),
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled', 'banned')),
  stripe_subscription_id text,
  joined_at timestamp with time zone default now(),
  primary key (room_id, user_id)
);
create index if not exists room_members_user_idx on public.room_members (user_id);

-- ── Messages ────────────────────────────────────────────────────────
-- image_url holds either an image or a video, disambiguated client-side
-- by extension (same convention as trades/posts/DMs).
create table if not exists public.channel_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  sender_id text not null references public.profiles(id) on delete cascade,
  content text not null default '',
  image_url text,
  poster_url text,
  created_at timestamp with time zone default now(),
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone
);
create index if not exists channel_messages_feed_idx
  on public.channel_messages (channel_id, created_at desc);

create table if not exists public.channel_message_reactions (
  message_id uuid not null references public.channel_messages(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  emoji text not null,
  created_at timestamp with time zone default now(),
  primary key (message_id, user_id, emoji)
);

-- ── Trust & safety (required for App Store review) ───────────────────
create table if not exists public.user_blocks (
  blocker_id text not null references public.profiles(id) on delete cascade,
  blocked_id text not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null references public.profiles(id) on delete cascade,
  target_type text not null
    check (target_type in ('channel_message', 'room', 'user', 'dm')),
  target_id text not null,
  reason text,
  status text not null default 'open'
    check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamp with time zone default now()
);
create index if not exists content_reports_status_idx on public.content_reports (status, created_at);

-- ── Stripe Connect creator accounts (populated in the billing step) ──
create table if not exists public.creator_accounts (
  user_id text primary key references public.profiles(id) on delete cascade,
  stripe_account_id text,
  onboarding_complete boolean not null default false,
  payouts_enabled boolean not null default false,
  created_at timestamp with time zone default now()
);

-- ── RLS: on, locked, service-role only ──────────────────────────────
alter table public.rooms                     enable row level security;
alter table public.channels                  enable row level security;
alter table public.room_members              enable row level security;
alter table public.channel_messages          enable row level security;
alter table public.channel_message_reactions enable row level security;
alter table public.user_blocks               enable row level security;
alter table public.content_reports           enable row level security;
alter table public.creator_accounts          enable row level security;
