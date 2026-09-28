-- Anonymous visit counter for the admin dashboard: one row per day and page, no personal data.
-- "visits" = browser sessions that landed on that page; "views" = every page shown.
create table public.site_visits (
  day date not null,
  path text not null,
  visits integer not null default 0,
  views integer not null default 0,
  primary key (day, path)
);
alter table public.site_visits enable row level security;
create policy "site_visits admin read" on public.site_visits for select to authenticated using ((select public.is_admin()));

-- Called from the browser on every public page. Unknown paths fold into '/otras' so nobody can fill the table.
-- The admin's own browsing is not counted.
create or replace function public.track_visit(p_path text, p_new_visit boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_path text := case when p_path = '/index' then '/' else p_path end;
begin
  if (select public.is_admin()) then return; end if;
  if v_path like '/admin%' or v_path like '/cuenta%' or v_path like '/comprar%' then return; end if;
  if v_path not in ('/', '/asesorias', '/gratis', '/cursos', '/terminos', '/privacidad', '/arrepentimiento') then v_path := '/otras'; end if;
  insert into public.site_visits as s (day, path, visits, views)
  values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, v_path, case when p_new_visit then 1 else 0 end, 1)
  on conflict (day, path) do update set visits = s.visits + excluded.visits, views = s.views + 1;
end $$;
revoke execute on function public.track_visit(text, boolean) from public;
grant execute on function public.track_visit(text, boolean) to anon, authenticated;
