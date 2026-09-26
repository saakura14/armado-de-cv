-- Creates an order computing every price on the server.
-- p_items: [{ "product_id": "cv-simple", "ebook_id": null, "extras": [{"group_id":"idiomas","option_id":"ingles","detail":null}] }]
create or replace function public.create_order(p_items jsonb, p_name text default null, p_phone text default null, p_note text default null)
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
begin
  if v_user is null then raise exception 'Necesitás iniciar sesión para comprar'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido está vacío';
  end if;
  if jsonb_array_length(p_items) > 20 then raise exception 'Demasiados productos en un pedido'; end if;

  insert into public.orders (user_id, total, customer_name, customer_phone, customer_note)
  values (v_user, 0, left(nullif(trim(p_name), ''), 120), left(nullif(trim(p_phone), ''), 40), left(nullif(trim(p_note), ''), 1000))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id = v_item->>'product_id' and active;
    if not found then raise exception 'Producto no disponible: %', v_item->>'product_id'; end if;

    v_ebook := null;
    if v_product.choice_label is not null then
      v_ebook := v_item->>'ebook_id';
      if not exists (select 1 from public.product_ebook_choices where product_id = v_product.id and ebook_id = v_ebook) then
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
  return v_order;
end $$;

-- Customer attaches the transfer receipt (already uploaded to receipts/<uid>/...).
create or replace function public.submit_receipt(p_order uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_path is null or split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'Comprobante inválido';
  end if;
  update public.orders
     set receipt_path = p_path, receipt_uploaded_at = now(), status = 'payment_review', updated_at = now()
   where id = p_order and user_id = auth.uid() and status in ('pending_payment','payment_review');
  if not found then raise exception 'No se puede adjuntar el comprobante a este pedido'; end if;
end $$;

create or replace function public.cancel_my_order(p_order uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.orders set status = 'cancelled', updated_at = now()
   where id = p_order and user_id = auth.uid() and status = 'pending_payment';
  if not found then raise exception 'Este pedido ya no se puede cancelar'; end if;
end $$;

-- Admin changes an order's status. Approving the payment unlocks e-books and
-- courses and creates the 1:1 sessions to schedule.
create or replace function public.admin_set_order_status(p_order uuid, p_status text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_item public.order_items;
  v_extra jsonb;
  v_minutes integer;
  v_needs_service boolean := false;
  v_status text := p_status;
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  if p_status not in ('pending_payment','payment_review','paid','in_progress','delivered','cancelled') then
    raise exception 'Estado inválido';
  end if;
  select * into v_order from public.orders where id = p_order for update;
  if not found then raise exception 'Pedido inexistente'; end if;

  if p_status in ('paid','in_progress','delivered') and v_order.paid_at is null then
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
        select session_minutes into v_minutes from public.extra_options
         where group_id = v_extra->>'group_id' and id = v_extra->>'option_id';
        if v_minutes is not null then
          insert into public.sessions (order_id, user_id, title, duration_minutes)
          values (p_order, v_order.user_id, v_item.product_name || ' · ' || (v_extra->>'label'), v_minutes);
        end if;
      end loop;

      if exists (select 1 from public.products where id = v_item.product_id and delivery in ('service','session')) then
        v_needs_service := true;
      end if;
    end loop;
    -- Purely digital orders are complete as soon as the payment is approved.
    if p_status = 'paid' and not v_needs_service then v_status := 'delivered'; end if;
  end if;

  update public.orders set
    status = v_status,
    admin_note = coalesce(p_note, admin_note),
    paid_at = case when v_status in ('paid','in_progress','delivered') then coalesce(paid_at, now()) else paid_at end,
    delivered_at = case when v_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
    updated_at = now()
  where id = p_order;
  return v_status;
end $$;

create or replace function public.admin_update_session(p_session uuid, p_scheduled_at timestamptz, p_meet_url text, p_status text default null, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  update public.sessions set
    scheduled_at = p_scheduled_at,
    meet_url = nullif(trim(p_meet_url), ''),
    status = coalesce(p_status, case when p_scheduled_at is not null then 'scheduled' else status end),
    admin_note = coalesce(p_note, admin_note)
  where id = p_session;
  if not found then raise exception 'Sesión inexistente'; end if;
end $$;

revoke execute on function public.create_order(jsonb, text, text, text) from public, anon;
revoke execute on function public.submit_receipt(uuid, text) from public, anon;
revoke execute on function public.cancel_my_order(uuid) from public, anon;
revoke execute on function public.admin_set_order_status(uuid, text, text) from public, anon;
revoke execute on function public.admin_update_session(uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.create_order(jsonb, text, text, text) to authenticated;
grant execute on function public.submit_receipt(uuid, text) to authenticated;
grant execute on function public.cancel_my_order(uuid) to authenticated;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;
grant execute on function public.admin_update_session(uuid, timestamptz, text, text, text) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

-- ============ Storage ============
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('receipts', 'receipts', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('ebooks', 'ebooks', false, 52428800, null),
  ('course-files', 'course-files', false, 104857600, null),
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "receipts: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "receipts: read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

create policy "ebooks: buyers read" on storage.objects for select to authenticated
  using (bucket_id = 'ebooks' and ((select public.is_admin()) or exists (
    select 1 from public.ebooks e join public.ebook_access a on a.ebook_id = e.id
     where e.file_path = storage.objects.name and a.user_id = (select auth.uid()))));
create policy "course files: buyers read" on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and ((select public.is_admin()) or exists (
    select 1 from public.lessons l join public.course_access a on a.course_id = l.course_id
     where l.attachment_path = storage.objects.name and a.user_id = (select auth.uid()))));
create policy "private files: admin write" on storage.objects for all to authenticated
  using (bucket_id in ('ebooks','course-files') and (select public.is_admin()))
  with check (bucket_id in ('ebooks','course-files') and (select public.is_admin()));

create policy "avatars: own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
