-- Run this in the Supabase SQL editor.
-- Adds an X/Twitter social link column, matching instagram/tiktok/etc.
alter table public.profiles add column if not exists twitter text;
