-- 1) Sales closed on WhatsApp: the admin records them by hand, without a customer account.
alter table public.orders alter column user_id drop not null;
alter table public.orders add column source text not null default 'web' check (source in ('web', 'whatsapp'));

create or replace function public.admin_record_sale(
  p_name text, p_phone text, p_product text, p_total integer, p_paid_on date,
  p_express boolean default false, p_delivered boolean default false, p_note text default null
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_product public.products;
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_paid timestamptz;
  v_order uuid;
  v_number bigint;
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora puede cargar ventas'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Falta el nombre del cliente'; end if;
  select * into v_product from public.products where id = p_product;
  if not found then raise exception 'Elegí qué compró'; end if;
  if p_total is null or p_total <= 0 then raise exception 'Revisá el monto'; end if;
  if p_paid_on is null or p_paid_on > v_today then raise exception 'Revisá la fecha: no puede ser futura'; end if;
  -- A sale from today keeps the current time; older ones are placed at noon (Argentina) of that day.
  v_paid := case when p_paid_on = v_today then now() else (p_paid_on + time '12:00') at time zone 'America/Argentina/Buenos_Aires' end;

  insert into public.orders (user_id, source, status, total, customer_name, customer_phone, admin_note, paid_at, delivered_at, payment_method, created_at)
  values (null, 'whatsapp', case when p_delivered then 'delivered' else 'paid' end, p_total, trim(p_name), nullif(trim(coalesce(p_phone, '')), ''),
          nullif(trim(coalesce(p_note, '')), ''), v_paid, case when p_delivered then v_paid end, 'transfer', v_paid)
  returning id, number into v_order, v_number;

  insert into public.order_items (order_id, product_id, product_name, unit_price, extras, line_total)
  values (v_order, v_product.id, v_product.name, p_total,
          case when p_express then jsonb_build_array(jsonb_build_object('group_id', 'express', 'option_id', 'express', 'label', 'Versión Express', 'detail', null, 'price', 0)) else '[]'::jsonb end,
          p_total);
  return v_number;
end $$;
revoke execute on function public.admin_record_sale(text, text, text, integer, date, boolean, boolean, text) from public, anon;
grant execute on function public.admin_record_sale(text, text, text, integer, date, boolean, boolean, text) to authenticated;

-- 2) Push notifications to the admin's phone (new orders and receipts).
create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
create policy "push subscriptions own" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (select public.is_admin()));

-- One notification per order and kind, so a customer can't flood the admin.
create table public.push_log (
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (order_id, kind)
);
alter table public.push_log enable row level security;

-- The VAPID keys live in Vault (vapid_private_key / vapid_public_key); only the notify-admin function reads them.
create or replace function public.push_config() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private_key'),
    'public', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public_key'))
$$;
revoke execute on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;
