-- WhatsApp sales of a 1:1 session (Asesoría de LinkedIn, Asesoría para entrevistas, Pack Premium, devolución)
-- also create the session to schedule, like web orders do. Those customers have no account, so user_id can be empty.
alter table public.sessions alter column user_id drop not null;

create or replace function public.admin_record_sale(p_name text, p_phone text, p_items jsonb, p_paid_on date, p_total integer default null, p_delivered boolean default false, p_note text default null)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  v_paid timestamptz;
  v_order uuid;
  v_number bigint;
  v_item jsonb;
  v_extra jsonb;
  v_product public.products;
  v_group public.extra_groups;
  v_option public.extra_options;
  v_extras jsonb;
  v_line integer;
  v_sum integer := 0;
  v_session_status text := case when p_delivered then 'done' else 'to_schedule' end;
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora puede cargar ventas'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'Falta el nombre del cliente'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Elegí qué compró'; end if;
  if p_paid_on is null or p_paid_on > v_today then raise exception 'Revisá la fecha: no puede ser futura'; end if;
  if p_total is not null and p_total <= 0 then raise exception 'Revisá el monto'; end if;
  -- A sale from today keeps the current time; older ones are placed at noon (Argentina) of that day.
  v_paid := case when p_paid_on = v_today then now() else (p_paid_on + time '12:00') at time zone 'America/Argentina/Buenos_Aires' end;

  insert into public.orders (user_id, source, status, total, customer_name, customer_phone, admin_note, paid_at, delivered_at, payment_method, created_at)
  values (null, 'whatsapp', case when p_delivered then 'delivered' else 'paid' end, 0, trim(p_name), nullif(trim(coalesce(p_phone, '')), ''),
          nullif(trim(coalesce(p_note, '')), ''), v_paid, case when p_delivered then v_paid end, 'transfer', v_paid)
  returning id, number into v_order, v_number;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = v_item->>'product_id';
    if not found then raise exception 'Producto desconocido: %', v_item->>'product_id'; end if;
    v_extras := '[]'::jsonb;
    v_line := v_product.price;
    if v_product.session_minutes is not null then
      insert into public.sessions (order_id, user_id, title, duration_minutes, status)
      values (v_order, null, v_product.name, v_product.session_minutes, v_session_status);
    end if;
    for v_extra in select * from jsonb_array_elements(coalesce(v_item->'extras', '[]'::jsonb)) loop
      select * into v_group from public.extra_groups where id = v_extra->>'group_id';
      if not found then raise exception 'Adicional desconocido: %', v_extra->>'group_id'; end if;
      select * into v_option from public.extra_options where group_id = v_group.id and id = coalesce(v_extra->>'option_id', v_group.id);
      if not found then select * into v_option from public.extra_options where group_id = v_group.id order by sort limit 1; end if;
      v_extras := v_extras || jsonb_build_object('group_id', v_group.id, 'option_id', v_option.id, 'label', v_option.label, 'detail', null, 'price', v_group.unit_price);
      v_line := v_line + v_group.unit_price;
      if v_option.session_minutes is not null then
        insert into public.sessions (order_id, user_id, title, duration_minutes, status)
        values (v_order, null, v_product.name || ' · ' || v_option.label, v_option.session_minutes, v_session_status);
      end if;
    end loop;
    insert into public.order_items (order_id, product_id, product_name, unit_price, extras, line_total)
    values (v_order, v_product.id, v_product.name, v_product.price, v_extras, v_line);
    v_sum := v_sum + v_line;
  end loop;

  update public.orders set total = coalesce(p_total, v_sum) where id = v_order;
  return v_number;
end $$;

-- WhatsApp sales already loaded with a session product get their session too.
insert into public.sessions (order_id, user_id, title, duration_minutes, status)
select o.id, null, oi.product_name, p.session_minutes, case when o.status = 'delivered' then 'done' else 'to_schedule' end
from public.orders o
join public.order_items oi on oi.order_id = o.id
join public.products p on p.id = oi.product_id
where o.source = 'whatsapp' and o.status <> 'cancelled' and p.session_minutes is not null
  and not exists (select 1 from public.sessions s where s.order_id = o.id);
