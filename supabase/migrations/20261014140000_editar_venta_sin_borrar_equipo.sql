-- Editing a WhatsApp sale used to delete all its items and insert them again, and the team task of a CV pack went with
-- them (ON DELETE CASCADE): a CV Gustavo had finished disappeared from his payment. Now the items that stay are updated
-- in place (same id, so their team task stays), and an item with team work can't be removed without unassigning it first.
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
    v_line := v_product.price;
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
      update public.order_items set product_name = v_product.name, unit_price = v_product.price, extras = v_extras, line_total = v_line where id = v_existing;
      v_kept := v_kept || v_existing;
    else
      insert into public.order_items (order_id, product_id, product_name, unit_price, extras, line_total)
      values (p_order, v_product.id, v_product.name, v_product.price, v_extras, v_line)
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

-- Deleting a repeated sale must not take a CV the team already started or finished with it.
create or replace function public.admin_delete_order(p_order uuid, p_number integer)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora'; end if;
  if exists (select 1 from public.card_payments where order_id = p_order) then
    raise exception 'Este pedido tiene un pago con tarjeta: cancelalo en vez de eliminarlo';
  end if;
  if exists (select 1 from public.team_tasks where order_id = p_order and status <> 'asignado') then
    raise exception 'El equipo ya trabajó en un CV de este pedido: eliminá el otro pedido repetido, o avisame para pasar ese CV al pedido correcto';
  end if;
  delete from public.orders where id = p_order and number = p_number;
  if not found then raise exception 'No encontré ese pedido'; end if;
end $$;
