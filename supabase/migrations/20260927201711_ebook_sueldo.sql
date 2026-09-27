-- New e-book: "Cuánto pedir de sueldo". The product starts hidden; it is activated once the PDF is uploaded.
insert into public.ebooks (id, title, active, description)
values ('sueldo-negociacion', 'Cuánto pedir de sueldo', true, 'Bruto y neto, cuánto se paga en tu puesto, cómo responder la pretensión salarial y cómo negociar una oferta o un aumento.');

insert into public.products (id, name, sort, notes, price, active, popular, category, delivery, features, subtitle)
values ('guia-sueldo', 'Cuánto pedir de sueldo', 35,
  array['Lo descargás desde "Mi cuenta" apenas confirmo tu pago.'],
  16000, false, false, 'guias', 'digital',
  array['Bruto, neto y cuánto cobrás en mano', 'Cómo responder "¿cuál es tu pretensión salarial?"', 'Cómo negociar una oferta o pedir un aumento'],
  'Guía 2026');

insert into public.product_ebooks (product_id, ebook_id) values ('guia-sueldo', 'sueldo-negociacion');

-- the 4-guide kit stays last in the section
update public.products set sort = 39 where name = 'Kit Búsqueda Laboral' and category = 'guias';
