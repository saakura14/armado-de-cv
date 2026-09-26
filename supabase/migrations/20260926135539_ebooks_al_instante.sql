-- Digital-only orders (e-books and guides) unlock as soon as the customer uploads a receipt that passes
-- basic checks. The admin later confirms the transfer arrived ("ok") or revokes access ("rejected").

alter table public.orders
  add column payment_check text check (payment_check in ('pending','ok','rejected')),
  add column receipt_etag text;   -- fingerprint of the uploaded file, to spot a receipt reused on another order
create index orders_receipt_etag_idx on public.orders(receipt_etag) where receipt_etag is not null;
create index orders_payment_check_idx on public.orders(payment_check) where payment_check = 'pending';

-- Grants everything an order includes: e-books, courses and 1:1 sessions. Internal: called by the RPCs below.
create or replace function public.grant_order_access(p_order uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders;
  v_item public.order_items;
  v_extra jsonb;
  v_minutes integer;
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
  return v_needs_service;
end $$;
revoke execute on function public.grant_order_access(uuid) from public, anon, authenticated;

-- Same behaviour as before, now reusing grant_order_access. Approving a payment that was
-- auto-approved marks the transfer as checked.
create or replace function public.admin_set_order_status(p_order uuid, p_status text, p_note text default null)
returns text language plpgsql security definer set search_path = '' as $$
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
    delivered_at = case when v_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end,
    payment_check = case when v_status in ('paid','in_progress','delivered') and payment_check = 'pending' then 'ok' else payment_check end,
    updated_at = now()
  where id = p_order;
  return v_status;
end $$;

-- Customer attaches the transfer receipt. Returns the resulting status:
-- 'delivered' when a digital-only order was unlocked right away, otherwise 'payment_review'.
drop function public.submit_receipt(uuid, text);
create function public.submit_receipt(p_order uuid, p_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_meta jsonb;
  v_etag text;
begin
  if p_path is null or split_part(p_path, '/', 1) <> v_user::text then
    raise exception 'Comprobante inválido';
  end if;
  select * into v_order from public.orders
   where id = p_order and user_id = v_user and status in ('pending_payment','payment_review') for update;
  if not found then raise exception 'No se puede adjuntar el comprobante a este pedido'; end if;

  select metadata into v_meta from storage.objects where bucket_id = 'receipts' and name = p_path;
  if v_meta is null then raise exception 'No encontramos el comprobante. Probá subirlo de nuevo.'; end if;
  v_etag := v_meta->>'eTag';

  update public.orders
     set receipt_path = p_path, receipt_uploaded_at = now(), receipt_etag = v_etag, status = 'payment_review', updated_at = now()
   where id = p_order;

  -- Instant access only when every rule passes; anything else waits for the admin as before.
  if v_order.total > 0
     -- only e-books and guides (no CV work, tests, sessions or courses)
     and not exists (select 1 from public.order_items oi join public.products p on p.id = oi.product_id
                      where oi.order_id = p_order and p.delivery <> 'digital')
     -- a real image or PDF, not a tiny or empty file
     and coalesce((v_meta->>'size')::bigint, 0) >= 15000
     and v_meta->>'mimetype' in ('image/jpeg','image/png','image/webp','image/heic','application/pdf')
     -- the same file wasn't used as the receipt of another order
     and not exists (select 1 from public.orders o where o.id <> p_order and o.receipt_etag = v_etag)
     -- nobody with a rejected payment, and at most 2 unchecked instant approvals per person
     and not exists (select 1 from public.orders o where o.user_id = v_user and o.payment_check = 'rejected')
     and (select count(*) from public.orders o where o.user_id = v_user and o.payment_check = 'pending') < 2
  then
    perform public.grant_order_access(p_order);
    update public.orders
       set status = 'delivered', paid_at = now(), delivered_at = now(), payment_check = 'pending', updated_at = now()
     where id = p_order;
    return 'delivered';
  end if;
  return 'payment_review';
end $$;
revoke execute on function public.submit_receipt(uuid, text) from public, anon;
grant execute on function public.submit_receipt(uuid, text) to authenticated;

-- Admin checks the bank: the transfer arrived (keep access) or it didn't (remove what this order unlocked).
create or replace function public.admin_review_instant_payment(p_order uuid, p_received boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  if p_received then
    update public.orders set payment_check = 'ok', admin_note = coalesce(p_note, admin_note), updated_at = now()
     where id = p_order and payment_check = 'pending';
  else
    delete from public.ebook_access where order_id = p_order;
    delete from public.course_access where order_id = p_order;
    update public.orders set payment_check = 'rejected', status = 'cancelled', delivered_at = null, paid_at = null,
           admin_note = coalesce(p_note, 'No se acreditó la transferencia. Escribime por WhatsApp si creés que es un error.'), updated_at = now()
     where id = p_order and payment_check = 'pending';
  end if;
  if not found then raise exception 'Este pedido no tiene una verificación pendiente'; end if;
end $$;
revoke execute on function public.admin_review_instant_payment(uuid, boolean, text) from public, anon;
grant execute on function public.admin_review_instant_payment(uuid, boolean, text) to authenticated;

-- Copy: digital products now unlock when the receipt is uploaded.
update public.products set notes = array_replace(notes, 'Lo descargás desde "Mi cuenta" apenas confirmo tu pago.', 'Lo descargás desde "Mi cuenta" apenas subís el comprobante de pago.');
update public.products set notes = array_replace(notes, 'Los descargás desde "Mi cuenta" apenas confirmo tu pago.', 'Los descargás desde "Mi cuenta" apenas subís el comprobante de pago.');
update public.faqs set answer = 'Son archivos PDF que podés leer desde el celular, la tablet o la computadora. Apenas subís el comprobante de la transferencia en tu pedido, los descargás desde "Mi cuenta".'
 where answer = 'Son archivos PDF que podés leer desde el celular, la tablet o la computadora. Los descargás desde "Mi cuenta" apenas se confirma tu pago.';
