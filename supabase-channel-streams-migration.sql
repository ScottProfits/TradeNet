-- Run in the Supabase SQL editor after the rooms migrations.
-- Live screen-share streaming inside channels (Cloudflare Realtime SFU).

create table if not exists public.channel_streams (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid not null references public.channels(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  broadcaster_id text not null references public.profiles(id) on delete cascade,
  cf_session_id text not null,               -- broadcaster's Cloudflare Realtime session
  video_track text,                          -- published track names on that session
  audio_track text,
  status text not null default 'live' check (status in ('live', 'ended')),
  title text,
  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone,
  last_seen_at timestamp with time zone not null default now(),  -- broadcaster heartbeat
  viewer_peak integer not null default 0
);
-- at most one live stream per channel
create unique index if not exists channel_streams_one_live
  on public.channel_streams (channel_id) where status = 'live';
create index if not exists channel_streams_live_idx
  on public.channel_streams (status, last_seen_at);

-- Daily streaming budget: cumulative live seconds per USER per calendar day
-- (their local day — the client sends the date). 1h35m = 5700s cap.
create table if not exists public.stream_usage (
  user_id text not null references public.profiles(id) on delete cascade,
  day date not null,
  seconds integer not null default 0,
  primary key (user_id, day)
);

alter table public.channel_streams enable row level security;
alter table public.stream_usage   enable row level security;
