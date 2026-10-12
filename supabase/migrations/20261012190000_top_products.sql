-- "Los más elegidos" on the home: the CV products sold the most in the last 60 days (paid, no tests or cancelled).
-- Only product ids and counts leave the database, so the public page can call it.
create or replace function public.top_products(p_limit integer default 3)
returns table (product_id text, sold integer)
language sql stable security definer set search_path = '' as $$
  select oi.product_id, count(*)::integer as sold
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where o.paid_at > now() - interval '60 days' and o.status <> 'cancelled' and o.number < 90000
    and p.active and p.category = 'cv'
  group by oi.product_id
  order by sold desc
  limit least(greatest(p_limit, 1), 6)
$$;
revoke execute on function public.top_products(integer) from public;
grant execute on function public.top_products(integer) to anon, authenticated;
