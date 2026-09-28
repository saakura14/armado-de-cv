-- Anonymous sales funnel for the admin dashboard: how many browser sessions opened "Lo quiero" and reached checkout.
create table public.site_events (
  day date not null,
  event text not null,
  count integer not null default 0,
  primary key (day, event)
);
alter table public.site_events enable row level security;
create policy "site_events admin read" on public.site_events for select to authenticated using ((select public.is_admin()));

-- Only known events are accepted; the admin's own clicks are not counted.
create or replace function public.track_event(p_event text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select public.is_admin()) then return; end if;
  if p_event not in ('lo_quiero', 'checkout') then return; end if;
  insert into public.site_events as s (day, event, count)
  values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, p_event, 1)
  on conflict (day, event) do update set count = s.count + 1;
end $$;
revoke execute on function public.track_event(text) from public;
grant execute on function public.track_event(text) to anon, authenticated;
