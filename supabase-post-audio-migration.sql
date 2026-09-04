-- Voice notes attached to a trade or a regular post.

alter table public.trades add column if not exists audio_url text;
alter table public.trades add column if not exists audio_duration integer;
alter table public.posts  add column if not exists audio_url text;
alter table public.posts  add column if not exists audio_duration integer;
