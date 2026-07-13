-- Run this in your Supabase SQL editor

-- Allow DMs to carry a photo/video attachment (reuses the same
-- image_url-holds-either-image-or-video convention as trades/posts,
-- disambiguated client-side by file extension).
alter table messages
  add column if not exists image_url text;
