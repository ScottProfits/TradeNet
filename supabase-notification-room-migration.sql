-- Channel-join notifications ("@x joined your channel").

alter table public.notifications add column if not exists room_id uuid;
