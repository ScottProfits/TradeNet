-- Run this in your Supabase SQL editor

-- Store a renewable access token (never the username/password) per broker
-- connection, so a scheduled job can re-sync fills without the user having
-- to manually reconnect every day.
alter table broker_connections
  add column if not exists access_token text,
  add column if not exists token_expiry timestamptz,
  add column if not exists account_id text,
  add column if not exists needs_reconnect boolean default false;
