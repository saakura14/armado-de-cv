-- Buyers download e-books through the ebook-download function, which stamps their email.
-- Direct storage reads are admin-only so nobody gets an unstamped copy.
drop policy "ebooks: buyers read" on storage.objects;
create policy "ebooks: admin read" on storage.objects for select to authenticated
  using (bucket_id = 'ebooks' and (select public.is_admin()));