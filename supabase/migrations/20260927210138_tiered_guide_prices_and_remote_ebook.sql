-- Tiered prices for the guides: short ones $12.000, core ones $16.000, the most requested topics $19.000.
update public.products set price = 12000 where id in ('guia-portales', 'guia-busqueda');
update public.products set price = 16000 where id in ('guia-ats', 'guia-linkedin');
update public.products set price = 19000 where id = 'guia-sueldo';
update public.products set features = array['Portales + LinkedIn + CV a prueba de ATS + Búsqueda organizada', 'Por separado $56.000: ahorrás $11.000', 'Todo lo que necesitás para buscar con estrategia']
 where id = 'kit-busqueda';

-- New e-book: "Trabajo remoto desde Latinoamérica". Hidden until the PDF is uploaded.
insert into public.ebooks (id, title, active, description)
values ('trabajo-remoto', 'Trabajo remoto desde Latinoamérica', true, 'Cómo conseguir tu primer trabajo para una empresa de afuera: CV internacional, LinkedIn, dónde buscar, cómo cobrar y plan de 30 días.');

insert into public.products (id, name, sort, notes, price, active, popular, category, delivery, features, subtitle)
values ('guia-remoto', 'Trabajo remoto desde Latinoamérica', 36,
  array['Lo descargás desde "Mi cuenta" apenas confirmo tu pago.'],
  19000, false, false, 'guias', 'digital',
  array['Tu CV y tu LinkedIn en modo internacional', 'Dónde buscar y cómo filtrar los avisos que te sirven', 'Cómo cobrar sin caer en estafas, y un plan de 30 días'],
  'Guía 2026');

insert into public.product_ebooks (product_id, ebook_id) values ('guia-remoto', 'trabajo-remoto');
