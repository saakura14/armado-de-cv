-- 1) Private data per order, only for the admin (the customer can read their own order row, so it can't live there).
create table public.order_private (
  order_id uuid primary key references public.orders(id) on delete cascade,
  canva_url text check (canva_url is null or length(canva_url) <= 500),
  updated_at timestamptz not null default now()
);
alter table public.order_private enable row level security;
create policy "order private admin" on public.order_private for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- 2) Order links with a special price (a discount agreed by WhatsApp).
alter table public.order_links add column custom_total integer check (custom_total is null or custom_total > 0);

create or replace function public.get_order_link(p_token uuid) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  v_link public.order_links;
  v_items json;
begin
  select * into v_link from public.order_links where token = p_token;
  if not found then return null; end if;
  select json_agg(json_build_object(
      'product_id', p.id, 'name', p.name, 'subtitle', p.subtitle, 'price', p.price, 'delivery', p.delivery,
      'active', p.active, 'notes', coalesce(p.notes, '{}'),
      'extras', coalesce((
        select json_agg(json_build_object(
          'group_id', g.id, 'option_id', o.id, 'price', g.unit_price,
          'label', case when (select count(*) from public.extra_options x where x.group_id = g.id) = 1 then g.label else o.label end))
        from jsonb_array_elements(coalesce(i.value->'extras', '[]'::jsonb)) e
        join public.extra_groups g on g.id = e->>'group_id'
        join public.extra_options o on o.group_id = g.id and o.id = e->>'option_id'), '[]'::json)
    ) order by i.ordinality)
  into v_items
  from jsonb_array_elements(v_link.items) with ordinality as i(value, ordinality)
  join public.products p on p.id = i.value->>'product_id';
  return json_build_object(
    'items', coalesce(v_items, '[]'::json),
    'customer_name', v_link.customer_name,
    'message', v_link.message,
    'custom_total', v_link.custom_total,
    'used', v_link.order_id is not null,
    'expired', v_link.expires_at < now(),
    'order_id', (select o.id from public.orders o where o.id = v_link.order_id and o.user_id = auth.uid()));
end $$;

-- Ties the link to the order just placed and, if the link has a special price, applies it (only while unpaid).
-- The order must contain exactly the link's products and add-ons, so a discounted link can't be used for another purchase.
create or replace function public.claim_order_link(p_token uuid, p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
  v_link_items jsonb;
  v_link_sig text;
  v_order_sig text;
begin
  select items into v_link_items from public.order_links where token = p_token;
  if not found then return; end if;
  select string_agg(sig, ',' order by sig) into v_link_sig from (
    select (i->>'product_id') || ':' || coalesce((select string_agg((e->>'group_id') || '/' || (e->>'option_id'), '+' order by (e->>'group_id') || '/' || (e->>'option_id'))
                                                  from jsonb_array_elements(coalesce(i->'extras', '[]'::jsonb)) e), '') as sig
    from jsonb_array_elements(v_link_items) i) s;
  select string_agg(sig, ',' order by sig) into v_order_sig from (
    select oi.product_id || ':' || coalesce((select string_agg((e->>'group_id') || '/' || (e->>'option_id'), '+' order by (e->>'group_id') || '/' || (e->>'option_id'))
                                             from jsonb_array_elements(oi.extras) e), '') as sig
    from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.order_id = p_order and o.user_id = auth.uid()) s;
  if v_order_sig is null or v_order_sig <> v_link_sig then return; end if;

  update public.order_links set order_id = p_order, used_at = now()
   where token = p_token and order_id is null and expires_at > now()
  returning custom_total into v_total;
  if found and v_total is not null then
    update public.orders set total = v_total, updated_at = now()
     where id = p_order and user_id = auth.uid() and status = 'pending_payment';
  end if;
end $$;

-- 3) Consent to receive news and new e-books by email (asked at checkout; can be withdrawn from Mi cuenta).
alter table public.profiles
  add column marketing_opt_in boolean not null default false,
  add column marketing_opt_in_at timestamptz;
