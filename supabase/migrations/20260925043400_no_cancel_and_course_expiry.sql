-- Orders can't be cancelled by the customer once placed (only the admin can).
drop function if exists public.cancel_my_order(uuid);

-- Courses are available for 12 months from payment approval.
alter table public.course_access add column expires_at timestamptz;
update public.course_access set expires_at = granted_at + interval '12 months' where expires_at is null;
alter table public.course_access alter column expires_at set not null;
create or replace function public.set_course_expiry() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.expires_at := coalesce(new.expires_at, new.granted_at + interval '12 months');
  return new;
end $$;
create trigger course_access_expiry before insert on public.course_access
  for each row execute function public.set_course_expiry();
revoke execute on function public.set_course_expiry() from public, anon, authenticated;

drop policy "lessons read" on public.lessons;
create policy "lessons read" on public.lessons for select to anon, authenticated using (
  is_preview
  or (select public.is_admin())
  or exists (select 1 from public.course_access ca where ca.course_id = lessons.course_id and ca.user_id = (select auth.uid()) and ca.expires_at > now())
);

drop policy "course files: buyers read" on storage.objects;
create policy "course files: buyers read" on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and ((select public.is_admin()) or exists (
    select 1 from public.lessons l join public.course_access a on a.course_id = l.course_id
     where l.attachment_path = storage.objects.name and a.user_id = (select auth.uid()) and a.expires_at > now())));
