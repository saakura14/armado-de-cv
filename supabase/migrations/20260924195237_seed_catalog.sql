insert into public.products (id, category, name, subtitle, price, delivery, session_minutes, choice_label, sort) values
  ('cv-simple','cv','Pack Simple','Curriculum Vitae',30000,'service',null,null,1),
  ('cv-medium','cv','Pack Medium','CV + carta de presentación',32000,'service',null,null,2),
  ('cv-premium','cv','Pack Premium','CV + LinkedIn + carta',60000,'service',null,null,3),
  ('linkedin','cv','Perfil de LinkedIn','Sin pack de CV',40000,'service',null,null,4),
  ('ebook','asesorias','E-book individual','Preparación a tu ritmo',20000,'digital',null,'¿Qué e-book querés?',10),
  ('asesoria-plus','asesorias','Pack Plus','2 e-books completos',35000,'digital',null,null,11),
  ('asesoria-premium','asesorias','Pack Premium','Pack Plus + sesión 1 a 1',60000,'session',90,null,12),
  ('test-vocacional','vocacional','Test de orientación vocacional','CHASIDE + TV-A',30000,'service',null,null,20);

insert into public.extra_groups (id, label, unit_price, hint) values
  ('express','Entrega express',15000,null),
  ('idiomas','Versión en otro idioma',15000,'Cada idioma suma una versión completa de tu CV.'),
  ('plataformas','Carga de tu perfil en plataformas de empleo',15000,'Armo y cargo tu perfil completo en cada plataforma que elijas.'),
  ('devolucion','Devolución personalizada',30000,'Recomendaciones prácticas y plan de intervención. Con turno previo.');

insert into public.extra_options (group_id, id, label, is_other, session_minutes, sort) values
  ('express','express','Versión Express: dentro de las 24 hs hábiles',false,null,1),
  ('idiomas','ingles','Inglés',false,null,1),
  ('idiomas','italiano','Italiano',false,null,2),
  ('idiomas','portugues','Portugués',false,null,3),
  ('idiomas','frances','Francés',false,null,4),
  ('idiomas','espanol','Español',false,null,5),
  ('idiomas','aleman','Alemán',false,null,6),
  ('idiomas','otro-idioma','Otro idioma',true,null,7),
  ('plataformas','zonajobs','Zonajobs',false,null,1),
  ('plataformas','bumeran','Bumeran',false,null,2),
  ('plataformas','computrabajo','Computrabajo',false,null,3),
  ('plataformas','hiringroom','HiringRoom',false,null,4),
  ('plataformas','indeed','Indeed',false,null,5),
  ('plataformas','otra-plataforma','Otra plataforma',true,null,6),
  ('devolucion','meet','Devolución 1 a 1 por Google Meet',false,60,1);

insert into public.product_extra_groups (product_id, group_id, sort) values
  ('cv-simple','express',1),('cv-simple','idiomas',2),('cv-simple','plataformas',3),
  ('cv-medium','express',1),('cv-medium','idiomas',2),('cv-medium','plataformas',3),
  ('cv-premium','express',1),('cv-premium','idiomas',2),('cv-premium','plataformas',3),
  ('linkedin','express',1),
  ('test-vocacional','devolucion',1);

insert into public.ebooks (id, title) values
  ('entrevistas-integral','Asesoría integral para entrevistas laborales'),
  ('entrevistas-virtuales','Asesoría especial: entrevistas virtuales'),
  ('tests-psicotecnicos','Tests laborales y psicotécnicos');

insert into public.product_ebook_choices (product_id, ebook_id, sort) values
  ('ebook','entrevistas-integral',1),('ebook','entrevistas-virtuales',2),('ebook','tests-psicotecnicos',3);

insert into public.product_ebooks (product_id, ebook_id) values
  ('asesoria-plus','entrevistas-integral'),('asesoria-plus','tests-psicotecnicos'),
  ('asesoria-premium','entrevistas-integral'),('asesoria-premium','tests-psicotecnicos');
