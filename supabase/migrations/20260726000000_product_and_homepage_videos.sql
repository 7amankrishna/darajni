-- Optional campaign and product videos. Existing images remain the poster and
-- fallback media when a video has not been attached.

alter table public.products
  add column if not exists video_url text check (
    video_url is null
    or (
      char_length(video_url) <= 2048
      and (
        (video_url like '/%' and video_url not like '//%')
        or video_url like 'https://%'
      )
    )
  );

alter table public.homepage_slides
  add column if not exists video_url text check (
    video_url is null
    or (
      char_length(video_url) <= 2048
      and (
        (video_url like '/%' and video_url not like '//%')
        or video_url like 'https://%'
      )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-videos',
  'product-videos',
  true,
  26214400,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product_videos_public_read" on storage.objects;
create policy "product_videos_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-videos');
