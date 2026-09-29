-- "Esperando al cliente": the delivery clock stops while the customer owes information or corrections.
alter table public.orders
  add column waiting_since timestamptz,
  add column paused_days integer not null default 0 check (paused_days >= 0);

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
    -- The business days it was waiting are added to the deadline.
    update public.orders set
      paused_days = paused_days + coalesce((select count(*) from generate_series(v_since, v_today - 1, interval '1 day') d
                                             where extract(isodow from d) < 6), 0),
      waiting_since = null, updated_at = now()
    where id = p_order and waiting_since is not null;
  end if;
end $$;
revoke execute on function public.admin_set_waiting(uuid, boolean) from public, anon;
grant execute on function public.admin_set_waiting(uuid, boolean) to authenticated;

-- Moving an order back from Entregado clears the delivery date (and stops waiting when it is delivered or cancelled).
create or replace function public.admin_set_order_status(p_order uuid, p_status text, p_note text default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_status text := p_status;
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  if p_status not in ('pending_payment','payment_review','paid','in_progress','delivered','cancelled') then
    raise exception 'Estado inválido';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido inexistente'; end if;

  if p_status in ('paid','in_progress','delivered') and v_order.paid_at is null then
    -- Purely digital orders are complete as soon as the payment is approved.
    if not public.grant_order_access(p_order) and p_status = 'paid' then v_status := 'delivered'; end if;
  end if;

  update public.orders set
    status = v_status,
    admin_note = coalesce(p_note, admin_note),
    paid_at = case when v_status in ('paid','in_progress','delivered') then coalesce(paid_at, now()) else paid_at end,
    delivered_at = case when v_status = 'delivered' then coalesce(delivered_at, now()) else null end,
    waiting_since = case when v_status in ('delivered','cancelled') then null else waiting_since end,
    payment_check = case when v_status in ('paid','in_progress','delivered') and payment_check = 'pending' then 'ok' else payment_check end,
    updated_at = now()
  where id = p_order;
  return v_status;
end $$;
