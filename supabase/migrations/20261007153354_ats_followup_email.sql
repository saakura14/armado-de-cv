-- Test ATS: email of each lead and the follow-up email sent an hour after the test (ats-followup function).
alter table public.ats_checks
  add column if not exists email text check (email is null or (char_length(email) <= 120 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column if not exists followup_sent_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();
create unique index if not exists ats_checks_email_key on public.ats_checks (email) where email is not null;
create unique index if not exists ats_checks_unsubscribe_token_key on public.ats_checks (unsubscribe_token);

drop function if exists public.ats_check_submit(text, text, integer, text[], boolean, text);

-- Records the lead. Returns first = true only the first time a number or an email is used; later tries just count the attempt.
create or replace function public.ats_check_submit(p_name text, p_phone text, p_score integer, p_issues text[], p_has_job_ad boolean, p_area text default null, p_email text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_name text := btrim(coalesce(p_name, ''));
  v_area text := case when p_area ~ '^[a-z]{2,20}$' then p_area end;
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'Escribí tu nombre'; end if;
  if v_phone !~ '^[0-9]{8,15}$' then raise exception 'Revisá el número de WhatsApp'; end if;
  if v_email is not null and (char_length(v_email) > 120 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then raise exception 'Revisá tu mail'; end if;
  if p_score is null or p_score < 0 or p_score > 100 then raise exception 'Resultado inválido'; end if;
  -- Same number written with or without the country code or the 9 counts as the same person.
  v_phone := right(v_phone, 10);
  if exists (select 1 from public.ats_checks where phone = v_phone or (v_email is not null and email = v_email)) then
    update public.ats_checks set attempts = attempts + 1, email = coalesce(email, v_email)
     where phone = v_phone and (v_email is null or not exists (select 1 from public.ats_checks other where other.email = v_email and other.phone <> v_phone));
    return jsonb_build_object('first', false);
  end if;
  -- Anti-flood: no more than 300 new leads per hour in total.
  if (select count(*) from public.ats_checks where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Hay mucha gente usando el test. Probá en unos minutos.';
  end if;
  insert into public.ats_checks (name, phone, email, score, issues, has_job_ad, area)
  values (v_name, v_phone, v_email, p_score, coalesce(p_issues[1:20], '{}'), coalesce(p_has_job_ad, false), v_area)
  on conflict do nothing;
  return jsonb_build_object('first', true);
end $$;
revoke execute on function public.ats_check_submit(text, text, integer, text[], boolean, text, text) from public;
grant execute on function public.ats_check_submit(text, text, integer, text[], boolean, text, text) to anon, authenticated;

-- "No quiero recibir más mails": the link in each email carries the lead's private token.
create or replace function public.ats_unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.ats_checks set unsubscribed_at = coalesce(unsubscribed_at, now()) where unsubscribe_token = p_token;
  return found;
end $$;
revoke execute on function public.ats_unsubscribe(uuid) from public;
grant execute on function public.ats_unsubscribe(uuid) to anon, authenticated;

-- Every 10 minutes the ats-followup function sends the emails of the tests done more than an hour ago.
select cron.schedule('ats-followup', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/ats-followup',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{}'::jsonb
  )
$$);
