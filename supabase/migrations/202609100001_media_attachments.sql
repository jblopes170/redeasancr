alter table public.news_posts
add column if not exists image_url text;

alter table public.suggestions
add column if not exists attachment_url text,
add column if not exists attachment_name text,
add column if not exists attachment_type text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'payment-receipts',
    'payment-receipts',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]
  ),
  (
    'news-media',
    'news-media',
    true,
    8388608,
    array['image/png', 'image/jpeg', 'image/webp']::text[]
  ),
  (
    'suggestion-attachments',
    'suggestion-attachments',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists news_media_insert_admin on storage.objects;
create policy news_media_insert_admin
on storage.objects for insert to authenticated
with check (
  bucket_id = 'news-media'
  and public.is_admin()
);

drop policy if exists news_media_delete_admin on storage.objects;
create policy news_media_delete_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'news-media'
  and public.is_admin()
);

drop policy if exists suggestion_attachments_insert_own on storage.objects;
create policy suggestion_attachments_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'suggestion-attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists suggestion_attachments_delete_own_or_admin on storage.objects;
create policy suggestion_attachments_delete_own_or_admin
on storage.objects for delete to authenticated
using (
  bucket_id = 'suggestion-attachments'
  and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin())
);
