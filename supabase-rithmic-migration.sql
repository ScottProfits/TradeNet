-- Run this in your Supabase SQL editor

-- Track broker connections per user
create table if not exists broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(id) on delete cascade,
  broker text not null,
  connected_at timestamptz not null default now(),
  unique (user_id, broker)
);

-- Enable RLS — users can only see and write their own rows
alter table broker_connections enable row level security;

create policy "Users can view own broker connections"
  on broker_connections for select
  using (auth.uid()::text = user_id);

create policy "Users can insert own broker connections"
  on broker_connections for insert
  with check (auth.uid()::text = user_id);

create policy "Users can update own broker connections"
  on broker_connections for update
  using (auth.uid()::text = user_id);

create policy "Users can delete own broker connections"
  on broker_connections for delete
  using (auth.uid()::text = user_id);

-- Add source tracking and dedup key to trades table
alter table trades
  add column if not exists source text,
  add column if not exists external_id text unique;

-- Index for fast dedup lookups
create index if not exists trades_external_id_idx on trades (external_id);
