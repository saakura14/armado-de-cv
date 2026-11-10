-- "Regalá un CV": a gift card bought on the web (for graduates, Christmas, a birthday). It is a digital product with no
-- e-books: once paid, the buyer gets a card (/regalo/tarjeta?t=<download_token>) with the recipient's name, a message
-- and the code REGALO-<order number>, which the recipient redeems by WhatsApp. The CV itself is then done as a $0 order.
alter table public.products drop constraint if exists products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('cv','asesorias','vocacional','curso','sesion','guias','etapas','regalos'));

insert into public.products (id, category, delivery, name, subtitle, price, features, highlight, notes, popular, sort, active) values
  ('regalo-cv', 'regalos', 'digital', 'Regalá un CV', 'CV moderno + CV ATS', 35000,
   array['Tarjeta de regalo lista para mandar o imprimir', 'Lo canjea cuando quiera: le armo 2 CV a medida (moderno + ATS)', 'Para quien busca trabajo, cambia de rubro o vuelve al mercado'],
   'El regalo que sirve', array[
     'Apenas se confirma el pago te llega por mail la tarjeta de regalo, con su nombre, tu mensaje y un código.',
     'Quien la recibe me escribe por WhatsApp con el código y arrancamos: 3 a 4 días hábiles desde que tengo su información.',
     'El código vale por 6 meses y es para una sola persona.'], true, 1, true),
  ('regalo-primer-empleo', 'regalos', 'digital', 'Regalá su primer CV', 'Pack Primer Empleo', 20000,
   array['Ideal para egresados y egresadas', 'Su primer CV profesional, listo para los filtros ATS', 'Destaco estudios, cursos y habilidades aunque no tenga experiencia'],
   'Para egresados', array[
     'Apenas se confirma el pago te llega por mail la tarjeta de regalo, con su nombre, tu mensaje y un código.',
     'Es para quien busca su primer trabajo (sin experiencia formal o con menos de 1 año).',
     'Quien la recibe me escribe por WhatsApp con el código y arrancamos: 3 a 4 días hábiles desde que tengo su información.',
     'El código vale por 6 meses y es para una sola persona.'], false, 2, true)
on conflict (id) do nothing;

-- The recipient's name and the message travel as $0 extras with free text (detail, up to 80 characters).
insert into public.extra_groups (id, label, unit_price, hint)
values ('regalo', 'Tarjeta de regalo', 0, 'Así sale en la tarjeta.')
on conflict (id) do nothing;
insert into public.extra_options (group_id, id, label, is_other, sort) values
  ('regalo', 'para', 'Para', true, 1),
  ('regalo', 'mensaje', 'Mensaje', true, 2)
on conflict do nothing;
insert into public.product_extra_groups (product_id, group_id, sort) values
  ('regalo-cv', 'regalo', 1),
  ('regalo-primer-empleo', 'regalo', 1)
on conflict do nothing;

-- The card, by its private token, only once the order is paid. Anyone with the link can see it (it is meant to be shared).
create or replace function public.get_gift_card(p_token uuid)
returns table (number integer, giver text, product text, subtitle text, recipient text, message text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select o.number, o.customer_name, p.name, p.subtitle,
    (select e->>'detail' from jsonb_array_elements(oi.extras) e where e->>'group_id' = 'regalo' and e->>'option_id' = 'para' limit 1),
    (select e->>'detail' from jsonb_array_elements(oi.extras) e where e->>'group_id' = 'regalo' and e->>'option_id' = 'mensaje' limit 1),
    o.created_at
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  join public.products p on p.id = oi.product_id
  where o.download_token = p_token and p.category = 'regalos' and o.status in ('paid', 'in_progress', 'delivered')
  limit 1
$$;
revoke execute on function public.get_gift_card(uuid) from public;
grant execute on function public.get_gift_card(uuid) to anon, authenticated;
