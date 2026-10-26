-- The "Cómo y dónde postularte" landings (/empleos/<empresa>) get their own row in the visit counter.
create or replace function public.track_visit(p_path text, p_new_visit boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_path text := case when p_path = '/index' then '/' else p_path end;
begin
  if (select public.is_admin()) then return; end if;
  if v_path like '/admin%' or v_path like '/cuenta%' or v_path like '/comprar%' then return; end if;
  if v_path not in ('/', '/asesorias', '/gratis', '/test-ats', '/guias/cv-ats', '/links', '/cursos', '/terminos', '/privacidad', '/arrepentimiento')
     and v_path !~ '^/empleos/[a-z0-9-]+$' then v_path := '/otras'; end if;
  insert into public.site_visits as s (day, path, visits, views)
  values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, v_path, case when p_new_visit then 1 else 0 end, 1)
  on conflict (day, path) do update set visits = s.visits + excluded.visits, views = s.views + 1;
end $$;
