-- Run in the Supabase SQL editor. Adds a live viewer counter to channel_streams
-- (viewer_peak already existed but nothing ever populated it).
alter table public.channel_streams
  add column if not exists viewer_count integer not null default 0;
