-- "Delete for me" on a DM thread: hides the conversation from one user's
-- list without touching the other person's copy. A later message from the
-- partner (created after hidden_at) brings the thread back.

create table if not exists public.dm_hidden (
  user_id text not null references public.profiles(id) on delete cascade,
  partner_id text not null references public.profiles(id) on delete cascade,
  hidden_at timestamp with time zone not null default now(),
  primary key (user_id, partner_id)
);

alter table public.dm_hidden enable row level security;
