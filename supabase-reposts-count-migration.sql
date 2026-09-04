-- Denormalised repost counters on trades/posts so every feed payload that
-- already does `select("*")` carries the count with no extra query.

alter table public.trades add column if not exists reposts_count integer not null default 0;
alter table public.posts  add column if not exists reposts_count integer not null default 0;

-- Backfill from any reposts that already exist.
update public.trades t
set reposts_count = c.n
from (select target_id, count(*) n from public.reposts where target_type = 'trade' group by target_id) c
where c.target_id = t.id;

update public.posts p
set reposts_count = c.n
from (select target_id, count(*) n from public.reposts where target_type = 'post' group by target_id) c
where c.target_id = p.id;
