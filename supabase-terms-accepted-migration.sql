-- Run this in the Supabase SQL editor.
-- Records when a user accepted the Terms / community standards (App Review
-- guideline 1.2: users must agree before accessing user-generated content).
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
