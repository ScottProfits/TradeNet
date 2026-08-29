-- Run in the Supabase SQL editor after the other rooms migrations.
-- Optional join approval for free channels + a 'pending' membership state.

alter table public.rooms
  add column if not exists requires_approval boolean not null default false;

alter table public.room_members
  drop constraint if exists room_members_status_check;
alter table public.room_members
  add constraint room_members_status_check
  check (status in ('active', 'past_due', 'canceled', 'banned', 'pending'));
