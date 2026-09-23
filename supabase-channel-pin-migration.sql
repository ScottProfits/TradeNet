-- Run this in the Supabase SQL editor.
-- One pinned message per topic channel (owner-set). If the pinned message
-- is deleted the pin clears itself.
alter table public.channels
  add column if not exists pinned_message_id uuid
  references public.channel_messages(id) on delete set null;
