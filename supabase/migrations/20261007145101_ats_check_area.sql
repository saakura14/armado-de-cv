-- Test ATS: the area the person applies to (the test compares the CV against it), so Vale knows what each lead is after.
alter table public.ats_checks add column if not exists area text check (area is null or area ~ '^[a-z]{2,20}$');

drop function if exists public.ats_check_submit(text, text, integer, text[], boolean);

-- Records the lead. Returns first = true only the first time a number is used; later tries just count the attempt.
create or replace function public.ats_check_submit(p_name text, p_phone text, p_score integer, p_issues text[], p_has_job_ad boolean, p_area text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name text := btrim(coalesce(p_name, ''));
  v_area text := case when p_area ~ '^[a-z]{2,20}$' then p_area end;
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
  insert into public.ats_checks (name, phone, score, issues, has_job_ad, area)
  values (v_name, v_phone, p_score, coalesce(p_issues[1:20], '{}'), coalesce(p_has_job_ad, false), v_area)
  on conflict (phone) do nothing
  returning id into v_id;
  if v_id is not null then return jsonb_build_object('first', true); end if;
  update public.ats_checks set attempts = attempts + 1 where phone = v_phone;
  return jsonb_build_object('first', false);
end $$;
revoke execute on function public.ats_check_submit(text, text, integer, text[], boolean, text) from public;
grant execute on function public.ats_check_submit(text, text, integer, text[], boolean, text) to anon, authenticated;
