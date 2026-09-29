-- Fix a WhatsApp sale recorded by hand: amount charged, customer name, phone and payment date.
-- Only the admin, and only for WhatsApp sales (web orders keep the amount the customer paid).
create or replace function public.admin_update_whatsapp_sale(
  p_order uuid, p_total integer, p_name text, p_phone text default null, p_paid_on date default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora puede editar ventas'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'No encontré ese pedido'; end if;
  if v_order.source <> 'whatsapp' then raise exception 'Solo se pueden editar las ventas cargadas por WhatsApp'; end if;
  if p_total is null or p_total <= 0 then raise exception 'Revisá el monto'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Falta el nombre del cliente'; end if;
  if p_paid_on is not null and p_paid_on > v_today then raise exception 'Revisá la fecha: no puede ser futura'; end if;
  update public.orders set
    total = p_total,
    customer_name = trim(p_name),
    customer_phone = nullif(trim(coalesce(p_phone, '')), ''),
    -- Changing the date keeps the time of day it already had.
    paid_at = case when p_paid_on is null then paid_at
                   else ((p_paid_on + ((paid_at at time zone 'America/Argentina/Buenos_Aires')::time)) at time zone 'America/Argentina/Buenos_Aires') end,
    created_at = case when p_paid_on is null then created_at
                   else ((p_paid_on + ((created_at at time zone 'America/Argentina/Buenos_Aires')::time)) at time zone 'America/Argentina/Buenos_Aires') end,
    delivered_at = case when p_paid_on is null or delivered_at is null then delivered_at
                   else greatest(delivered_at, ((p_paid_on + ((paid_at at time zone 'America/Argentina/Buenos_Aires')::time)) at time zone 'America/Argentina/Buenos_Aires')) end,
    updated_at = now()
  where id = p_order;
end $$;
revoke execute on function public.admin_update_whatsapp_sale(uuid, integer, text, text, date) from public, anon;
grant execute on function public.admin_update_whatsapp_sale(uuid, integer, text, text, date) to authenticated;
