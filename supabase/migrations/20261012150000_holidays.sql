-- Argentine holidays: Vale doesn't work them, so the days an order waits for the customer only count business days.
-- Same list as lib/holidays.ts (keep both in sync; add each year's bridge days when they are announced).
create table public.holidays (
  day date primary key,
  name text not null
);
alter table public.holidays enable row level security;
create policy "Feriados públicos" on public.holidays for select using (true);
grant select on public.holidays to anon, authenticated;

insert into public.holidays (day, name) values
  ('2026-01-01', 'Año Nuevo'), ('2026-02-16', 'Carnaval'), ('2026-02-17', 'Carnaval'),
  ('2026-03-23', 'Día no laborable con fines turísticos'), ('2026-03-24', 'Día de la Memoria'),
  ('2026-04-02', 'Malvinas'), ('2026-04-03', 'Viernes Santo'), ('2026-05-01', 'Día del Trabajador'),
  ('2026-05-25', 'Revolución de Mayo'), ('2026-06-15', 'Paso a la Inmortalidad de Güemes'), ('2026-06-20', 'Día de la Bandera'),
  ('2026-07-09', 'Día de la Independencia'), ('2026-07-10', 'Día no laborable con fines turísticos'),
  ('2026-08-17', 'Paso a la Inmortalidad de San Martín'), ('2026-10-12', 'Día del Respeto a la Diversidad Cultural'),
  ('2026-11-23', 'Día de la Soberanía Nacional'), ('2026-12-07', 'Día no laborable con fines turísticos'),
  ('2026-12-08', 'Inmaculada Concepción'), ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'), ('2027-02-08', 'Carnaval'), ('2027-02-09', 'Carnaval'), ('2027-03-24', 'Día de la Memoria'),
  ('2027-03-26', 'Viernes Santo'), ('2027-04-02', 'Malvinas'), ('2027-05-25', 'Revolución de Mayo'),
  ('2027-06-21', 'Paso a la Inmortalidad de Güemes'), ('2027-07-09', 'Día de la Independencia'),
  ('2027-08-16', 'Paso a la Inmortalidad de San Martín'), ('2027-10-11', 'Día del Respeto a la Diversidad Cultural'),
  ('2027-12-08', 'Inmaculada Concepción');

create or replace function public.admin_set_waiting(p_order uuid, p_waiting boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_since date;
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora'; end if;
  if p_waiting then
    update public.orders set waiting_since = coalesce(waiting_since, now()), updated_at = now() where id = p_order;
  else
    select (waiting_since at time zone 'America/Argentina/Buenos_Aires')::date into v_since from public.orders where id = p_order;
    -- The business days it was waiting (no weekends, no holidays) are added to the deadline.
    update public.orders set
      paused_days = paused_days + coalesce((select count(*) from generate_series(v_since, v_today - 1, interval '1 day') d
                                             where extract(isodow from d) < 6
                                               and not exists (select 1 from public.holidays h where h.day = d::date)), 0),
      waiting_since = null, updated_at = now()
    where id = p_order and waiting_since is not null;
  end if;
end $$;
revoke execute on function public.admin_set_waiting(uuid, boolean) from public, anon;
grant execute on function public.admin_set_waiting(uuid, boolean) to authenticated;
