-- Funnel steps of the free ATS test (ads send traffic there): who picked a PDF and who got their score.
create or replace function public.track_event(p_event text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select public.is_admin()) then return; end if;
  if p_event not in ('lo_quiero', 'checkout', 'whatsapp', 'test_subido', 'test_puntaje') then return; end if;
  insert into public.site_events as s (day, event, count)
  values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, p_event, 1)
  on conflict (day, event) do update set count = s.count + 1;
end $$;
