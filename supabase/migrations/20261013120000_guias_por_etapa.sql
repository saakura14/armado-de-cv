-- "Guías por etapa": one e-book per age stage (20, 30, 40 y 50+), sold in their own section of the home at $12.000.
-- The PDFs are uploaded to the private "ebooks" bucket with admin-upload (?ebook=<id>), which fills file_path.
alter table public.products drop constraint products_category_check;
alter table public.products add constraint products_category_check
  check (category in ('cv','asesorias','vocacional','curso','sesion','guias','etapas'));

insert into public.ebooks (id, title, description, cover_url, pages, active) values
  ('etapa-20', 'Tu primer trabajo a los 20', 'Cómo conseguir tu primer empleo sin experiencia: tu experiencia escondida, CV de una página, dónde buscar, pasantías, primer LinkedIn, entrevistas y plan de 30 días.', '/img/guias/etapa-20.jpg', 13, true),
  ('etapa-30', 'Crecer o cambiar de rubro a los 30', 'Crecer o cambiar de rubro sin empezar de cero: qué puesto buscar, CV con logros, filtros ATS, LinkedIn, entrevistas, cómo pedir más sueldo y plan de 30 días.', '/img/guias/etapa-30.jpg', 12, true),
  ('etapa-40', 'Buscar trabajo a los 40', 'Que tu experiencia se note: CV de 2 páginas con logros, pausas laborales, filtros ATS, LinkedIn, reconversión, entrevistas y plan de 30 días.', '/img/guias/etapa-40.jpg', 13, true),
  ('etapa-50', 'Buscar trabajo a los 50 y más', 'Tu experiencia como ventaja: CV sin edad, filtros ATS, consultoras y contactos, las preguntas incómodas de la entrevista, otras salidas laborales y plan de 30 días.', '/img/guias/etapa-50.jpg', 13, true);

insert into public.products (id, category, name, subtitle, price, delivery, active, sort, features, notes) values
  ('guia-etapa-20', 'etapas', 'Tu primer trabajo a los 20', 'Guía por etapa · 20+', 12000, 'digital', true, 40,
    array['Cómo armar tu CV aunque no tengas experiencia (y tu experiencia escondida)', 'Dónde buscar: portales, empresas, consultoras y pasantías', 'Tu primer LinkedIn y cómo responder en la entrevista'],
    array['Te llega por mail apenas confirmo tu pago, sin crear cuenta.']),
  ('guia-etapa-30', 'etapas', 'Crecer o cambiar de rubro a los 30', 'Guía por etapa · 30+', 12000, 'digital', true, 41,
    array['Cómo decidir: ¿crecer en tu rubro o cambiar?', 'CV con logros y adaptado a cada búsqueda', 'Cambiar de rubro sin empezar de cero y pedir más sueldo'],
    array['Te llega por mail apenas confirmo tu pago, sin crear cuenta.']),
  ('guia-etapa-40', 'etapas', 'Buscar trabajo a los 40', 'Guía por etapa · 40+', 12000, 'digital', true, 42,
    array['Tu CV de 2 páginas con logros (y cómo contar una pausa laboral)', 'Pasar los filtros automáticos y que te encuentren en LinkedIn', 'Reconversión, entrevistas y negociación'],
    array['Te llega por mail apenas confirmo tu pago, sin crear cuenta.']),
  ('guia-etapa-50', 'etapas', 'Buscar trabajo a los 50 y más', 'Guía por etapa · 50+', 12000, 'digital', true, 43,
    array['Tu CV sin edad: qué sacar y qué dejar', 'Consultoras, contactos y otras salidas laborales', 'Cómo responder "¿no estás sobrecalificado?" y otras preguntas incómodas'],
    array['Te llega por mail apenas confirmo tu pago, sin crear cuenta.']);

insert into public.product_ebooks (product_id, ebook_id) values
  ('guia-etapa-20', 'etapa-20'), ('guia-etapa-30', 'etapa-30'), ('guia-etapa-40', 'etapa-40'), ('guia-etapa-50', 'etapa-50');
