-- Free ATS test (/test-ats): the CV is analyzed in the visitor's browser and never uploaded.
-- To see the detailed result they leave name and WhatsApp: one free detailed analysis per number.
create table public.ats_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 80),
  phone text not null unique check (phone ~ '^[0-9]{8,15}$'),
  score integer not null check (score between 0 and 100),
  issues text[] not null default '{}',
  has_job_ad boolean not null default false,
  attempts integer not null default 1,
  contacted_at timestamptz
);
create index ats_checks_created on public.ats_checks (created_at desc);

alter table public.ats_checks enable row level security;
create policy "ats checks admin" on public.ats_checks for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Records the lead. Returns first = true only the first time a number is used; later tries just count the attempt.
create or replace function public.ats_check_submit(p_name text, p_phone text, p_score integer, p_issues text[], p_has_job_ad boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'Escribí tu nombre'; end if;
  if v_phone !~ '^[0-9]{8,15}$' then raise exception 'Revisá el número de WhatsApp'; end if;
  if p_score is null or p_score < 0 or p_score > 100 then raise exception 'Resultado inválido'; end if;
  -- Same number written with or without the country code or the 9 counts as the same person.
  v_phone := right(v_phone, 10);
  -- Anti-flood: no more than 300 new leads per hour in total.
  if (select count(*) from public.ats_checks where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Hay mucha gente usando el test. Probá en unos minutos.';
  end if;
  insert into public.ats_checks (name, phone, score, issues, has_job_ad)
  values (v_name, v_phone, p_score, coalesce(p_issues[1:20], '{}'), coalesce(p_has_job_ad, false))
  on conflict (phone) do nothing
  returning id into v_id;
  if v_id is not null then return jsonb_build_object('first', true); end if;
  update public.ats_checks set attempts = attempts + 1 where phone = v_phone;
  return jsonb_build_object('first', false);
end $$;
revoke execute on function public.ats_check_submit(text, text, integer, text[], boolean) from public;
grant execute on function public.ats_check_submit(text, text, integer, text[], boolean) to anon, authenticated;

-- /test-ats counts as a public page in the visit counter.
create or replace function public.track_visit(p_path text, p_new_visit boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_path text := case when p_path = '/index' then '/' else p_path end;
begin
  if (select public.is_admin()) then return; end if;
  if v_path like '/admin%' or v_path like '/cuenta%' or v_path like '/comprar%' then return; end if;
  if v_path not in ('/', '/asesorias', '/gratis', '/test-ats', '/cursos', '/terminos', '/privacidad', '/arrepentimiento') then v_path := '/otras'; end if;
  insert into public.site_visits as s (day, path, visits, views)
  values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, v_path, case when p_new_visit then 1 else 0 end, 1)
  on conflict (day, path) do update set visits = s.visits + excluded.visits, views = s.views + 1;
end $$;
