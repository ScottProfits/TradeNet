-- Voice comments: an audio clip attached to a comment (content may be blank).

alter table public.comments add column if not exists audio_url text;
alter table public.comments add column if not exists audio_duration integer;
