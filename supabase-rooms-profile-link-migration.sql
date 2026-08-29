-- Run in the Supabase SQL editor after the other rooms migrations.
-- Lets a channel owner choose whether the channel is linked from their
-- public profile (some owners don't want to recruit new members).

alter table public.rooms
  add column if not exists show_on_profile boolean not null default true;
