-- Prices by WhatsApp: some products are sold by chat at a different price than on the web (the LinkedIn guide goes
-- for $16.000 by WhatsApp and $7.900 on the web). Each product can have its WhatsApp price, and each line of a sale
-- can carry the price she actually charged ("price" in the item), which wins over both.
alter table public.products add column if not exists whatsapp_price integer check (whatsapp_price is null or whatsapp_price > 0);
update public.products set whatsapp_price = 16000 where id = 'guia-linkedin' and whatsapp_price is null;

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
  v_base integer;
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
    -- What she charged for this line, else the WhatsApp price, else the web price.
    v_base := coalesce((v_item->>'price')::integer, v_product.whatsapp_price, v_product.price);
    v_line := v_base;
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
    values (v_order, v_product.id, v_product.name, v_base, v_extras, v_line);
    v_sum := v_sum + v_line;
  end loop;

  update public.orders set total = coalesce(p_total, v_sum) where id = v_order;
  return v_number;
end $$;

create or replace function public.admin_update_whatsapp_sale_items(p_order uuid, p_items jsonb, p_total integer default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_item jsonb;
  v_extra jsonb;
  v_product public.products;
  v_group public.extra_groups;
  v_option public.extra_options;
  v_extras jsonb;
  v_line integer;
  v_base integer;
  v_sum integer := 0;
  v_titles text[] := '{}';
  v_minutes integer[] := '{}';
  v_title text;
  v_kept uuid[] := '{}';
  v_existing uuid;
  i integer;
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora puede editar ventas'; end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found or v_order.source <> 'whatsapp' then raise exception 'Solo se pueden editar ventas cargadas por WhatsApp'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Elegí qué compró'; end if;
  if p_total is not null and p_total <= 0 then raise exception 'Revisá el monto'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = v_item->>'product_id';
    if not found then raise exception 'Producto desconocido: %', v_item->>'product_id'; end if;
    v_extras := '[]'::jsonb;
    -- What she charged for this line, else the WhatsApp price, else the web price.
    v_base := coalesce((v_item->>'price')::integer, v_product.whatsapp_price, v_product.price);
    v_line := v_base;
    if v_product.session_minutes is not null then
      v_titles := v_titles || v_product.name; v_minutes := v_minutes || v_product.session_minutes;
    end if;
    for v_extra in select * from jsonb_array_elements(coalesce(v_item->'extras', '[]'::jsonb)) loop
      select * into v_group from public.extra_groups where id = v_extra->>'group_id';
      if not found then raise exception 'Adicional desconocido: %', v_extra->>'group_id'; end if;
      select * into v_option from public.extra_options where group_id = v_group.id and id = coalesce(v_extra->>'option_id', v_group.id);
      if not found then select * into v_option from public.extra_options where group_id = v_group.id order by sort limit 1; end if;
      v_extras := v_extras || jsonb_build_object('group_id', v_group.id, 'option_id', v_option.id, 'label', v_option.label, 'detail', null, 'price', v_group.unit_price);
      v_line := v_line + v_group.unit_price;
      if v_option.session_minutes is not null then
        v_titles := v_titles || (v_product.name || ' · ' || v_option.label); v_minutes := v_minutes || v_option.session_minutes;
      end if;
    end loop;

    -- The same product already in the order keeps its row (and its team task); otherwise it is a new row.
    select id into v_existing from public.order_items
    where order_id = p_order and product_id = v_product.id and not (id = any(v_kept))
    order by (exists (select 1 from public.team_tasks t where t.order_item_id = order_items.id)) desc, id
    limit 1;
    if v_existing is not null then
      update public.order_items set product_name = v_product.name, unit_price = v_base, extras = v_extras, line_total = v_line where id = v_existing;
      v_kept := v_kept || v_existing;
    else
      insert into public.order_items (order_id, product_id, product_name, unit_price, extras, line_total)
      values (p_order, v_product.id, v_product.name, v_base, v_extras, v_line)
      returning id into v_existing;
      v_kept := v_kept || v_existing;
    end if;
    v_sum := v_sum + v_line;
  end loop;

  -- What is no longer bought goes away, unless the team already worked on it.
  if exists (select 1 from public.order_items i join public.team_tasks t on t.order_item_id = i.id where i.order_id = p_order and not (i.id = any(v_kept))) then
    raise exception 'Ese pack ya está asignado al equipo: sacá la asignación en Equipo antes de quitarlo de la venta';
  end if;
  delete from public.order_items where order_id = p_order and not (id = any(v_kept));

  update public.orders set total = coalesce(p_total, v_sum), updated_at = now() where id = p_order;

  -- Sessions: add the new ones, drop the unscheduled ones that are no longer bought.
  delete from public.sessions where order_id = p_order and status = 'to_schedule' and not (title = any(v_titles));
  for i in 1 .. coalesce(array_length(v_titles, 1), 0) loop
    v_title := v_titles[i];
    if not exists (select 1 from public.sessions where order_id = p_order and title = v_title) then
      insert into public.sessions (order_id, user_id, title, duration_minutes, status)
      values (p_order, null, v_title, v_minutes[i], case when v_order.status = 'delivered' then 'done' else 'to_schedule' end);
    end if;
  end loop;
end $$;
revoke execute on function public.admin_update_whatsapp_sale_items(uuid, jsonb, integer) from public, anon;
grant execute on function public.admin_update_whatsapp_sale_items(uuid, jsonb, integer) to authenticated;

-- A CV marked urgent shows a small lightning bolt in the team member's list.
alter table public.team_tasks add column if not exists urgent boolean not null default false;

-- The team member jumps between Canva and the panel all the time: coming back within 20 minutes continues the same
-- visit instead of opening a new one, so Vale sees one range per work stretch.
create or replace function public.team_heartbeat(p_leaving boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_member uuid := public.my_team_member_id();
  v_session uuid;
begin
  if v_member is null then return; end if;
  -- Two signals at the same moment (opening the app) must not open two visits.
  perform pg_advisory_xact_lock(hashtext(v_member::text));
  update public.team_sessions set ended_at = last_seen_at
  where member_id = v_member and ended_at is null and last_seen_at < now() - interval '20 minutes';
  select id into v_session from public.team_sessions
  where member_id = v_member and coalesce(ended_at, last_seen_at) > now() - interval '20 minutes'
  order by started_at desc limit 1;
  if p_leaving then
    if v_session is not null then update public.team_sessions set last_seen_at = now(), ended_at = now() where id = v_session; end if;
    return;
  end if;
  if v_session is null then
    insert into public.team_sessions (member_id) values (v_member);
  else
    update public.team_sessions set last_seen_at = now(), ended_at = null where id = v_session;
  end if;
end $$;

-- The visits already recorded, joined the same way (gaps under 20 minutes are one stretch).
create temporary table visit_groups on commit drop as
with ordered as (
  select id, member_id, started_at, coalesce(ended_at, last_seen_at) as finish, ended_at,
         case when started_at - max(coalesce(ended_at, last_seen_at)) over (partition by member_id order by started_at, id rows between unbounded preceding and 1 preceding) < interval '20 minutes' then 0 else 1 end as fresh
  from public.team_sessions
), grouped as (
  select *, sum(fresh) over (partition by member_id order by started_at, id rows unbounded preceding) as grp from ordered
)
select g.id, first_value(g.id) over (partition by g.member_id, g.grp order by g.started_at, g.id) as keep_id,
       min(g.started_at) over (partition by g.member_id, g.grp) as started_at,
       max(g.finish) over (partition by g.member_id, g.grp) as finish,
       bool_or(g.ended_at is null) over (partition by g.member_id, g.grp) as open
from grouped g;
update public.team_sessions s set started_at = v.started_at, last_seen_at = v.finish, ended_at = case when v.open and v.finish > now() - interval '20 minutes' then null else v.finish end
from visit_groups v where v.id = s.id and v.keep_id = s.id;
delete from public.team_sessions s using visit_groups v where v.id = s.id and v.keep_id <> s.id;
