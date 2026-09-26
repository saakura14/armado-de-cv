-- Public images for social media scheduling (Metricool reads them by URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('social', 'social', true, 10485760, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy "social: admin write" on storage.objects for all to authenticated
  using (bucket_id = 'social' and (select public.is_admin()))
  with check (bucket_id = 'social' and (select public.is_admin()));