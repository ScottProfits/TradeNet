-- Users table (synced from Clerk)
create table public.profiles (
  id text primary key,
  handle text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  brokerage text,
  win_rate numeric default 0,
  pnl_month numeric default 0,
  followers_count integer default 0,
  following_count integer default 0,
  verified boolean default false,
  created_at timestamp with time zone default now()
);

-- Trades table
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(id) on delete cascade,
  ticker text not null,
  direction text check (direction in ('LONG', 'SHORT')),
  entry numeric not null,
  exit numeric,
  pnl numeric,
  pnl_percent numeric,
  caption text,
  likes_count integer default 0,
  comments_count integer default 0,
  copies_count integer default 0,
  created_at timestamp with time zone default now()
);

-- Follows table
create table public.follows (
  follower_id text references public.profiles(id) on delete cascade,
  following_id text references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (follower_id, following_id)
);

-- Likes table
create table public.likes (
  user_id text references public.profiles(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (user_id, trade_id)
);

-- Comments table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(id) on delete cascade,
  trade_id uuid references public.trades(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.trades enable row level security;
alter table public.follows enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

-- Policies (anyone can read, only owner can write)
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can insert their own profile" on public.profiles for insert with check (true);
create policy "Users can update their own profile" on public.profiles for update using (true);

create policy "Trades are viewable by everyone" on public.trades for select using (true);
create policy "Users can insert trades" on public.trades for insert with check (true);
create policy "Users can update their own trades" on public.trades for update using (true);

create policy "Follows are viewable by everyone" on public.follows for select using (true);
create policy "Users can follow" on public.follows for insert with check (true);
create policy "Users can unfollow" on public.follows for delete using (true);

create policy "Likes are viewable by everyone" on public.likes for select using (true);
create policy "Users can like" on public.likes for insert with check (true);
create policy "Users can unlike" on public.likes for delete using (true);

create policy "Comments are viewable by everyone" on public.comments for select using (true);
create policy "Users can comment" on public.comments for insert with check (true);
