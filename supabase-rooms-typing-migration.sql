-- Run in the Supabase SQL editor after the other rooms migrations.
-- Ephemeral "user is typing" pings for channel chat. Rows are short-lived
-- (the API only counts pings from the last few seconds) and refreshed on
-- keystroke; nothing needs to clean them up but a periodic delete is fine.

create table if not exists public.channel_typing (
  channel_id uuid not null references public.channels(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  updated_at timestamp with time zone not null default now(),
  primary key (channel_id, user_id)
);
create index if not exists channel_typing_recent_idx
  on public.channel_typing (channel_id, updated_at desc);

alter table public.channel_typing enable row level security;
