-- Selling the guides: impulse prices, a discounted guide inside the CV packs, buying without an account and a
-- download link by email for buyers without an account.

-- 1. Prices: guides at $5.900–7.900 and the 4-guide kit at $19.900.
update public.products set price = 5900 where id in ('guia-portales', 'guia-busqueda');
update public.products set price = 7900 where id in ('guia-linkedin', 'guia-ats', 'guia-sueldo', 'guia-remoto');
update public.products set price = 19900,
  features = array['Portales + LinkedIn + CV a prueba de ATS + Búsqueda organizada', 'Por separado $27.600: ahorrás $7.700', 'Todo lo que necesitás para buscar con estrategia']
where id = 'kit-busqueda';

-- 2. Order bump: a guide at $3.900 when it goes with a CV pack. The option says which e-book it unlocks.
alter table public.extra_options add column if not exists ebook_id text references public.ebooks(id);
insert into public.extra_groups (id, label, unit_price, hint)
values ('guia-extra', 'Sumá una guía con descuento', 3900, 'Precio especial con tu pack: la descargás desde Mi cuenta apenas confirmo el pago.')
on conflict (id) do update set label = excluded.label, unit_price = excluded.unit_price, hint = excluded.hint;
insert into public.extra_options (group_id, id, label, is_other, sort, ebook_id) values
  ('guia-extra', 'portales', 'Portales de empleo 2026', false, 1, 'portales-empleo'),
  ('guia-extra', 'linkedin', 'LinkedIn para conseguir trabajo', false, 2, 'linkedin-reclutadores'),
  ('guia-extra', 'sueldo', 'Cuánto pedir de sueldo', false, 3, 'sueldo-negociacion')
on conflict (group_id, id) do update set label = excluded.label, sort = excluded.sort, ebook_id = excluded.ebook_id;
insert into public.product_extra_groups (product_id, group_id, sort)
select p, 'guia-extra', 9 from unnest(array['cv-primer-empleo', 'cv-simple', 'cv-medium', 'cv-premium', 'linkedin']) p
on conflict do nothing;

-- grant_order_access also unlocks the e-books chosen as extras.
create or replace function public.grant_order_access(p_order uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_item public.order_items;
  v_extra jsonb;
  v_minutes integer;
  v_ebook text;
  v_needs_service boolean := false;
begin
  select * into v_order from public.orders where id = p_order;
  for v_item in select * from public.order_items where order_id = p_order loop
    insert into public.ebook_access (user_id, ebook_id, order_id)
      select v_order.user_id, pe.ebook_id, p_order from public.product_ebooks pe where pe.product_id = v_item.product_id
      on conflict do nothing;
    if v_item.chosen_ebook_id is not null then
      insert into public.ebook_access (user_id, ebook_id, order_id) values (v_order.user_id, v_item.chosen_ebook_id, p_order)
      on conflict do nothing;
    end if;
    insert into public.course_access (user_id, course_id, order_id)
      select v_order.user_id, c.id, p_order from public.courses c where c.product_id = v_item.product_id
      on conflict do nothing;

    select session_minutes into v_minutes from public.products where id = v_item.product_id;
    if v_minutes is not null then
      insert into public.sessions (order_id, user_id, title, duration_minutes)
      values (p_order, v_order.user_id, v_item.product_name, v_minutes);
    end if;
    for v_extra in select * from jsonb_array_elements(v_item.extras) loop
      select session_minutes, ebook_id into v_minutes, v_ebook from public.extra_options
       where group_id = v_extra->>'group_id' and id = v_extra->>'option_id';
      if v_minutes is not null then
        insert into public.sessions (order_id, user_id, title, duration_minutes)
        values (p_order, v_order.user_id, v_item.product_name || ' · ' || (v_extra->>'label'), v_minutes);
      end if;
      if v_ebook is not null and v_order.user_id is not null then
        insert into public.ebook_access (user_id, ebook_id, order_id) values (v_order.user_id, v_ebook, p_order)
        on conflict do nothing;
      end if;
    end loop;

    if exists (select 1 from public.products where id = v_item.product_id and delivery in ('service','session')) then
      v_needs_service := true;
    end if;
  end loop;
  return v_needs_service;
end $$;
revoke execute on function public.grant_order_access(uuid) from public, anon, authenticated;

-- 3. Guides can be bought without an account too (CV packs, sessions and guides; anything else still needs one).
create or replace function public.create_order(p_items jsonb, p_accept_terms boolean, p_name text default null, p_phone text default null,
  p_note text default null, p_email text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_user uuid := auth.uid();
  v_guest boolean := coalesce((auth.jwt()->>'is_anonymous')::boolean, false);
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
  v_email text := left(lower(nullif(trim(p_email), '')), 120);
begin
  if v_user is null then raise exception 'Necesitás iniciar sesión para comprar'; end if;
  if not coalesce(p_accept_terms, false) then raise exception 'Tenés que aceptar los términos y condiciones'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido está vacío';
  end if;
  if jsonb_array_length(p_items) > 20 then raise exception 'Demasiados productos en un pedido'; end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Revisá tu mail: no parece válido'; end if;
  if v_guest and (v_name is null or v_phone is null or v_email is null) then
    raise exception 'Completá tu nombre, tu WhatsApp y tu mail';
  end if;

  insert into public.orders (user_id, total, customer_name, customer_phone, customer_email, customer_note, terms_accepted_at)
  values (v_user, 0, v_name, v_phone, v_email, left(nullif(trim(p_note), ''), 1000), now())
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = v_item->>'product_id' and active;
    if not found then raise exception 'Producto no disponible: %', v_item->>'product_id'; end if;
    if v_guest and v_product.delivery not in ('service', 'session', 'digital') then
      raise exception 'Para comprar este producto creá tu cuenta: así lo tenés siempre en Mi cuenta';
    end if;

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
  update public.profiles set full_name = coalesce(full_name, v_name), phone = coalesce(v_phone, phone) where id = v_user;
  return v_order;
end $function$;
revoke execute on function public.create_order(jsonb, boolean, text, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, boolean, text, text, text, text) to authenticated;

-- 4. Download link by email for orders bought without an account: a secret token per order opens /descargar.
alter table public.orders
  add column if not exists download_token uuid not null default gen_random_uuid(),
  add column if not exists ebook_mail_sent_at timestamptz;
create unique index if not exists orders_download_token_idx on public.orders(download_token);

-- The e-books an order unlocked, for the /descargar page (anyone holding the token).
create or replace function public.get_order_downloads(p_token uuid)
returns table (ebook_id text, title text, order_number bigint)
language sql stable security definer set search_path = '' as $$
  select a.ebook_id, e.title, o.number
  from public.orders o
  join public.ebook_access a on a.order_id = o.id and a.user_id = o.user_id
  join public.ebooks e on e.id = a.ebook_id
  where o.download_token = p_token and coalesce(o.payment_check, 'ok') <> 'rejected'
  order by e.title
$$;
revoke execute on function public.get_order_downloads(uuid) from public;
grant execute on function public.get_order_downloads(uuid) to anon, authenticated;
