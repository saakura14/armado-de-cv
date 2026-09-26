-- Instant e-book delivery now also requires the receipt to be read (verify-receipt edge function):
-- recipient = the store's account, exact amount, plausible date, no signs of editing, and a transfer
-- number never used before. The decision moves out of submit_receipt into finish_receipt_check.

alter table public.orders
  add column receipt_ai jsonb,              -- what the reader saw and why it approved or not (shown to the admin)
  add column receipt_operation_id text;     -- transfer / operation number read from the receipt
create index orders_receipt_operation_idx on public.orders(receipt_operation_id) where receipt_operation_id is not null;

-- Rules that don't need to read the image. Internal.
create or replace function public.instant_eligible(p_order uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select o.status = 'payment_review'
     and o.total > 0
     and o.receipt_path is not null
     and not exists (select 1 from public.order_items oi join public.products p on p.id = oi.product_id
                     where oi.order_id = o.id and p.delivery <> 'digital')
     and coalesce((so.metadata->>'size')::bigint, 0) >= 15000
     and so.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp','application/pdf')
     and not exists (select 1 from public.orders x where x.id <> o.id and x.receipt_etag = o.receipt_etag)
     and not exists (select 1 from public.orders x where x.user_id = o.user_id and x.payment_check = 'rejected')
     and (select count(*) from public.orders x where x.user_id = o.user_id and x.payment_check = 'pending') < 2
  from public.orders o
  left join storage.objects so on so.bucket_id = 'receipts' and so.name = o.receipt_path
  where o.id = p_order
$$;

-- Customer attaches the receipt: always goes to review first; verify-receipt may approve it right after.
create or replace function public.submit_receipt(p_order uuid, p_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_meta jsonb;
begin
  if p_path is null or split_part(p_path, '/', 1) <> v_user::text then
    raise exception 'Comprobante inválido';
  end if;
  perform 1 from public.orders
   where id = p_order and user_id = v_user and status in ('pending_payment','payment_review') for update;
  if not found then raise exception 'No se puede adjuntar el comprobante a este pedido'; end if;

  select metadata into v_meta from storage.objects where bucket_id = 'receipts' and name = p_path;
  if v_meta is null then raise exception 'No encontramos el comprobante. Probá subirlo de nuevo.'; end if;

  update public.orders
     set receipt_path = p_path, receipt_uploaded_at = now(), receipt_etag = v_meta->>'eTag',
         receipt_ai = null, receipt_operation_id = null, status = 'payment_review', updated_at = now()
   where id = p_order;
  return 'payment_review';
end $$;

-- Called by verify-receipt (service role) with the reading result. Approves only if the reader said so,
-- the rules still hold and the transfer number was never used on another order.
create or replace function public.finish_receipt_check(p_order uuid, p_result jsonb, p_operation_id text, p_approve boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_operation text := nullif(regexp_replace(coalesce(p_operation_id, ''), '\s', '', 'g'), '');
  v_result jsonb := p_result;
begin
  if v_operation is not null and exists (select 1 from public.orders where id <> p_order and receipt_operation_id = v_operation) then
    v_result := v_result || jsonb_build_object('veredicto', 'revisar', 'motivo', 'El número de operación ya se usó en otro pedido.');
    p_approve := false;
  end if;

  update public.orders set receipt_ai = v_result, receipt_operation_id = v_operation, updated_at = now() where id = p_order;

  if p_approve and public.instant_eligible(p_order) then
    perform public.grant_order_access(p_order);
    update public.orders
       set status = 'delivered', paid_at = now(), delivered_at = now(), payment_check = 'pending', updated_at = now()
     where id = p_order;
    return 'delivered';
  end if;
  return (select status from public.orders where id = p_order);
end $$;

revoke execute on function public.instant_eligible(uuid) from public, anon, authenticated;
revoke execute on function public.finish_receipt_check(uuid, jsonb, text, boolean) from public, anon, authenticated;
grant execute on function public.instant_eligible(uuid) to service_role;
grant execute on function public.finish_receipt_check(uuid, jsonb, text, boolean) to service_role;
grant execute on function public.grant_order_access(uuid) to service_role;
