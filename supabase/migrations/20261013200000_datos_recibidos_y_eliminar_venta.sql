-- The delivery clock of a CV starts when Vale has everything from the customer (CV, puesto, datos), not at payment.
-- Orders already paid keep their clock as it was.
alter table public.orders add column if not exists data_received_at timestamptz;
update public.orders set data_received_at = paid_at where paid_at is not null and data_received_at is null;

-- Starting the work (En proceso or delivered) means the data arrived.
create or replace function public.orders_data_received() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.data_received_at is null and new.status in ('in_progress', 'delivered') and new.status is distinct from old.status then
    new.data_received_at := now();
  end if;
  return new;
end $$;
drop trigger if exists orders_data_received on public.orders;
create trigger orders_data_received before update of status on public.orders
  for each row execute function public.orders_data_received();

-- So does giving it to the team.
create or replace function public.team_task_data_received() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set data_received_at = now(), updated_at = now() where id = new.order_id and data_received_at is null;
  return new;
end $$;
drop trigger if exists team_tasks_data_received on public.team_tasks;
create trigger team_tasks_data_received after insert on public.team_tasks
  for each row execute function public.team_task_data_received();

-- "Ya tengo todo" starts the clock today; "Todavía faltan datos" takes it back to zero (and drops any pause).
create or replace function public.admin_set_data_received(p_order uuid, p_received boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora'; end if;
  update public.orders set
    data_received_at = case when p_received then now() else null end,
    waiting_since = null,
    paused_days = 0,
    updated_at = now()
  where id = p_order and status in ('paid', 'in_progress');
end $$;
revoke execute on function public.admin_set_data_received(uuid, boolean) from public, anon;
grant execute on function public.admin_set_data_received(uuid, boolean) to authenticated;

-- A sale loaded twice by mistake: deleting it takes it out of the metrics. The number must match, as a second check.
-- Card payments are a record of real money: those orders are cancelled, never deleted.
create or replace function public.admin_delete_order(p_order uuid, p_number integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora'; end if;
  if exists (select 1 from public.card_payments where order_id = p_order) then
    raise exception 'Este pedido tiene un pago con tarjeta: cancelalo en vez de eliminarlo';
  end if;
  delete from public.orders where id = p_order and number = p_number;
  if not found then raise exception 'No encontré ese pedido'; end if;
end $$;
revoke execute on function public.admin_delete_order(uuid, integer) from public, anon;
grant execute on function public.admin_delete_order(uuid, integer) to authenticated;
