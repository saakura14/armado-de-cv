alter table public.products drop constraint products_category_check;
alter table public.products add constraint products_category_check check (category in ('cv','asesorias','vocacional','curso','sesion','guias'));

insert into public.ebooks (id, title, description) values
  ('portales-empleo', 'Portales de empleo 2026', 'Cómo optimizar ZonaJobs, Bumeran, Computrabajo, LinkedIn e Indeed para que te encuentren.'),
  ('linkedin-reclutadores', 'LinkedIn que te encuentra', 'Perfil, titular, "Acerca de", búsqueda de avisos y cómo contactar reclutadores.'),
  ('cv-filtros-ats', 'CV a prueba de filtros ATS', 'Qué es un ATS, qué lo confunde y cómo alinear tu CV a cada aviso.'),
  ('busqueda-organizada', 'Búsqueda organizada en 30 días', 'Objetivos, rutina semanal, planilla de seguimiento y networking.')
on conflict (id) do nothing;

insert into public.products (id, category, name, subtitle, price, delivery, sort, popular, features, notes) values
  ('guia-portales', 'guias', 'Portales de empleo', 'Guía 2026', 16000, 'digital', 30, false,
    array['ZonaJobs, Bumeran, Computrabajo, Indeed y LinkedIn: qué mira cada algoritmo','Paso a paso para aparecer primero en las búsquedas','Checklist imprimible por plataforma'],
    array['Lo descargás desde "Mi cuenta" apenas confirmo tu pago.']),
  ('guia-linkedin', 'guias', 'LinkedIn que te encuentra', 'Guía práctica', 16000, 'digital', 31, false,
    array['Foto, banner, titular y "Acerca de" con fórmulas y ejemplos','Cómo buscar avisos ocultos y postularte bien (Easy Apply y complejas)','Plantillas de mensajes para reclutadores'],
    array['Lo descargás desde "Mi cuenta" apenas confirmo tu pago.']),
  ('guia-ats', 'guias', 'CV a prueba de filtros ATS', 'Guía práctica', 16000, 'digital', 32, false,
    array['Qué es un ATS y cómo "lee" tu CV','Los errores de formato que te dejan afuera','Cómo usar las palabras clave de cada aviso'],
    array['Lo descargás desde "Mi cuenta" apenas confirmo tu pago.']),
  ('guia-busqueda', 'guias', 'Búsqueda organizada', 'Plan de 30 días', 16000, 'digital', 33, false,
    array['Objetivos claros y rutina semanal de búsqueda','Planilla de seguimiento lista para usar','Networking y seguimiento sin insistir de más'],
    array['Lo descargás desde "Mi cuenta" apenas confirmo tu pago.']),
  ('kit-busqueda', 'guias', 'Kit Búsqueda Laboral', 'Las 4 guías', 45000, 'digital', 34, true,
    array['Portales de empleo + LinkedIn + CV a prueba de ATS + Búsqueda organizada','Por separado $64.000: ahorrás $19.000','Todo lo que necesitás para buscar con estrategia'],
    array['Los descargás desde "Mi cuenta" apenas confirmo tu pago.'])
on conflict (id) do nothing;

insert into public.product_ebooks (product_id, ebook_id) values
  ('guia-portales','portales-empleo'), ('guia-linkedin','linkedin-reclutadores'), ('guia-ats','cv-filtros-ats'), ('guia-busqueda','busqueda-organizada'),
  ('kit-busqueda','portales-empleo'), ('kit-busqueda','linkedin-reclutadores'), ('kit-busqueda','cv-filtros-ats'), ('kit-busqueda','busqueda-organizada')
on conflict do nothing;

-- Asesorías e-books at the new round price
update public.products set price = 18000 where id = 'ebook';