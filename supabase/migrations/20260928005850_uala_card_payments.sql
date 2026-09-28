-- Card payments through Ualá Bis. Transfer stays the main option; the card carries Ualá's fee
-- (4.9% + IVA = 5.929%) on top so the store receives the full price. Off until the Ualá
-- credentials are loaded as Edge Function secrets and the admin turns it on.
alter table public.payment_settings
  add column card_enabled boolean not null default false,
  add column card_fee numeric(6,5) not null default 0.05929 check (card_fee >= 0 and card_fee < 0.2);

alter table public.orders
  add column payment_method text check (payment_method in ('transfer', 'card')),
  add column card_total integer;

-- Every checkout link created in Ualá for an order. Only the uala edge function (service role) touches it.
create table public.card_payments (
  uala_order_id text primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  amount integer not null,
  checkout_url text not null,
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index card_payments_order_idx on public.card_payments (order_id, created_at desc);
alter table public.card_payments enable row level security;
create policy "card payments admin read" on public.card_payments for select to authenticated using ((select public.is_admin()));

-- Records the status the edge function read back from Ualá (never what a webhook claims) and,
-- when the payment went through, unlocks the order like an approved transfer.
create function public.mark_card_payment(p_uala_order text, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.card_payments;
  v_order public.orders;
  v_status text;
begin
  select * into v_payment from public.card_payments where uala_order_id = p_uala_order for update;
  if not found then raise exception 'Orden de Ualá desconocida'; end if;
  update public.card_payments set status = p_status, updated_at = now() where uala_order_id = p_uala_order;

  select * into v_order from public.orders where id = v_payment.order_id for update;
  if p_status not in ('APPROVED', 'PROCESSED') or v_order.paid_at is not null then
    return v_order.status;
  end if;

  -- Purely digital orders are complete as soon as the payment goes through.
  v_status := case when public.grant_order_access(v_order.id) then 'paid' else 'delivered' end;
  update public.orders set
    status = v_status,
    payment_method = 'card',
    card_total = v_payment.amount,
    payment_check = 'ok',
    paid_at = now(),
    delivered_at = case when v_status = 'delivered' then now() else delivered_at end,
    updated_at = now()
  where id = v_order.id;
  return v_status;
end $$;

revoke execute on function public.mark_card_payment(text, text) from public, anon, authenticated;
