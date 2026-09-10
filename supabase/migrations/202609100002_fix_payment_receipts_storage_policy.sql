insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists payment_receipts_insert_own on storage.objects;
create policy payment_receipts_insert_own
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'payment-receipts'
  and split_part(name, '/', 1) = (select auth.uid())::text
);

drop policy if exists payment_receipts_delete_own on storage.objects;
create policy payment_receipts_delete_own
on storage.objects for delete
to authenticated
using (
  bucket_id = 'payment-receipts'
  and (
    split_part(name, '/', 1) = (select auth.uid())::text
    or public.is_admin()
  )
);
