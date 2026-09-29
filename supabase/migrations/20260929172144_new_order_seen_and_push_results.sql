-- "Nuevo" badge in the admin panel: web orders start unseen until Vale sees them in Pedidos.
alter table public.orders add column seen_at timestamptz;
update public.orders set seen_at = coalesce(updated_at, created_at) where seen_at is null;

-- Sales Vale loads herself (WhatsApp) are already seen.
create or replace function public.mark_own_sale_seen() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.source = 'whatsapp' then new.seen_at := coalesce(new.seen_at, now()); end if;
  return new;
end $$;
create trigger orders_own_sale_seen before insert on public.orders for each row execute function public.mark_own_sale_seen();

create or replace function public.admin_mark_orders_seen(p_orders uuid[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora'; end if;
  update public.orders set seen_at = now() where id = any(p_orders) and seen_at is null;
end $$;
revoke execute on function public.admin_mark_orders_seen(uuid[]) from public, anon;
grant execute on function public.admin_mark_orders_seen(uuid[]) to authenticated;

-- What happened with each notification, to find out why one didn't arrive.
alter table public.push_log add column sent integer, add column failed integer, add column error text;
