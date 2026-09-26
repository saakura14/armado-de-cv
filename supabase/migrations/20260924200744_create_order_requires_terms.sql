drop function public.create_order(jsonb, text, text, text);

create function public.create_order(p_items jsonb, p_accept_terms boolean, p_name text default null, p_phone text default null, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_item jsonb;
  v_extra jsonb;
  v_product public.products;
  v_option public.extra_options;
  v_group public.extra_groups;
  v_ebook text;
  v_extras jsonb;
  v_line integer;
  v_total integer := 0;
  v_detail text;
  v_seen text[];
  v_name text := left(nullif(trim(p_name), ''), 120);
  v_phone text := left(nullif(trim(p_phone), ''), 40);
begin
  if v_user is null then raise exception 'Necesitás iniciar sesión para comprar'; end if;
  if not coalesce(p_accept_terms, false) then raise exception 'Tenés que aceptar los términos y condiciones'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido está vacío';
  end if;
  if jsonb_array_length(p_items) > 20 then raise exception 'Demasiados productos en un pedido'; end if;

  insert into public.orders (user_id, total, customer_name, customer_phone, customer_note, terms_accepted_at)
  values (v_user, 0, v_name, v_phone, left(nullif(trim(p_note), ''), 1000), now())
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = v_item->>'product_id' and active;
    if not found then raise exception 'Producto no disponible: %', v_item->>'product_id'; end if;

    v_ebook := null;
    if v_product.choice_label is not null then
      v_ebook := v_item->>'ebook_id';
      if not exists (select 1 from public.product_ebook_choices c join public.ebooks e on e.id = c.ebook_id
                      where c.product_id = v_product.id and c.ebook_id = v_ebook and e.active) then
        raise exception 'Elegí qué e-book querés';
      end if;
    end if;

    v_line := v_product.price;
    v_extras := '[]'::jsonb;
    v_seen := '{}';
    for v_extra in select * from jsonb_array_elements(coalesce(v_item->'extras', '[]'::jsonb)) loop
      if not exists (select 1 from public.product_extra_groups where product_id = v_product.id and group_id = v_extra->>'group_id') then
        raise exception 'Extra no válido para %', v_product.name;
      end if;
      select * into v_option from public.extra_options where group_id = v_extra->>'group_id' and id = v_extra->>'option_id';
      if not found then raise exception 'Opción no válida'; end if;
      if (v_option.group_id || '/' || v_option.id) = any(v_seen) then continue; end if;
      v_seen := v_seen || (v_option.group_id || '/' || v_option.id);
      select * into v_group from public.extra_groups where id = v_option.group_id;
      v_detail := left(nullif(trim(v_extra->>'detail'), ''), 80);
      if v_option.is_other and v_detail is null then raise exception 'Contanos cuál necesitás en "%"', v_option.label; end if;
      v_extras := v_extras || jsonb_build_object('group_id', v_group.id, 'option_id', v_option.id, 'label', v_option.label,
        'detail', case when v_option.is_other then v_detail end, 'price', v_group.unit_price);
      v_line := v_line + v_group.unit_price;
    end loop;

    insert into public.order_items (order_id, product_id, product_name, unit_price, chosen_ebook_id, extras, line_total)
    values (v_order, v_product.id, v_product.name, v_product.price, v_ebook, v_extras, v_line);
    v_total := v_total + v_line;
  end loop;

  update public.orders set total = v_total where id = v_order;
  -- remember contact details for next time
  update public.profiles set full_name = coalesce(full_name, v_name), phone = coalesce(v_phone, phone) where id = v_user;
  return v_order;
end $$;

revoke execute on function public.create_order(jsonb, boolean, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, boolean, text, text, text) to authenticated;
