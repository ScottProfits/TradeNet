-- Reposts: a user re-sharing another user's trade or post onto their own
-- feed and profile. Visible to everyone (global feed), not just followers.

create table if not exists public.reposts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('trade', 'post')),
  target_id uuid not null,
  created_at timestamp with time zone not null default now(),
  unique (user_id, target_type, target_id)
);

create index if not exists reposts_feed_idx on public.reposts (created_at desc);
create index if not exists reposts_user_idx on public.reposts (user_id, created_at desc);
create index if not exists reposts_target_idx on public.reposts (target_type, target_id);

-- Writes go through supabaseAdmin (Clerk-authenticated), same as the rest
-- of the app; RLS on with no policies = locked to the service role.
alter table public.reposts enable row level security;
