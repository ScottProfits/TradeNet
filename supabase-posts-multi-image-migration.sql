-- Adds support for up to 3 images per post.
-- image_url is kept as-is (first image, for backward compatibility with any
-- code/rows that only ever read that single column); image_urls holds the
-- full ordered list.
alter table public.posts add column if not exists image_urls text[];

-- Backfill existing single-image posts into the new array column.
update public.posts
set image_urls = array[image_url]
where image_url is not null and image_urls is null;
