-- Run in the Supabase SQL editor after the other rooms migrations.
-- Lets a channel owner make a topic post-only for owner/mods (members can
-- still read + react) — e.g. a "trade breakdowns" topic that's just videos.

alter table public.channels
  add column if not exists mods_only_posts boolean not null default false;
