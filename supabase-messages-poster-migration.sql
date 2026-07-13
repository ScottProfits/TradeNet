-- Run this in your Supabase SQL editor

-- Store a real extracted video-frame thumbnail for DM video attachments,
-- instead of always falling back to the generic branded poster.
alter table messages
  add column if not exists poster_url text;
