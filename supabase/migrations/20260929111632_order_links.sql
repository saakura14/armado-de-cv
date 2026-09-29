-- Order links: Vale builds an order in the panel and sends the link; the customer opens it, signs in,
-- confirms and pays like any web order. The link remembers which order it turned into (traceability).
create table public.order_links (
  token uuid primary key default gen_random_uuid(),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20),
  customer_name text,
  customer_phone text,
  message text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  order_id uuid references public.orders(id) on delete set null,
  used_at timestamptz
);
alter table public.order_links enable row level security;
create policy "order links admin" on public.order_links for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- What the customer sees when opening the link, with current catalog prices. Anyone with the token can read it.
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
    'used', v_link.order_id is not null,
    'expired', v_link.expires_at < now(),
    -- The resulting order, only for the customer who placed it.
    'order_id', (select o.id from public.orders o where o.id = v_link.order_id and o.user_id = auth.uid()));
end $$;
revoke execute on function public.get_order_link(uuid) from public;
grant execute on function public.get_order_link(uuid) to anon, authenticated;

-- Right after create_order: ties the link to the order the customer just placed. Works once.
create or replace function public.claim_order_link(p_token uuid, p_order uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.order_links set order_id = p_order, used_at = now()
   where token = p_token and order_id is null and expires_at > now()
     and exists (select 1 from public.orders where id = p_order and user_id = auth.uid());
end $$;
revoke execute on function public.claim_order_link(uuid, uuid) from public, anon;
grant execute on function public.claim_order_link(uuid, uuid) to authenticated;
