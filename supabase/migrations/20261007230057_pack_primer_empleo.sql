-- Pack Primer Empleo: one simple ATS CV for people looking for their first job. Vale builds it herself
-- (it is not in TEAM_PACKS, so it can't be assigned to the team). First in the CV list.
update public.products set sort = sort + 1 where category = 'cv';

insert into public.products (id, category, name, subtitle, price, delivery, active, sort, features, notes, highlight, price_note, popular)
values (
  'cv-primer-empleo', 'cv', 'Pack Primer Empleo', 'Tu primer CV', 20000, 'service', true, 1,
  array[
    'Para quienes buscan su primer trabajo',
    '1 CV profesional, simple y sin foto, optimizado para filtros ATS',
    'Destaco tus estudios, cursos y habilidades aunque no tengas experiencia'
  ],
  array[
    'Solo para primer empleo: sin experiencia laboral formal o con menos de 1 año. Si ya trabajaste, elegí el Pack Simple.',
    'Incluye 1 CV (sin versión moderna con foto ni carta). Si querés sumarlas, elegí el Pack Simple o el Medium.',
    'Me pasás tus datos por el formulario: estudios, cursos, voluntariados, proyectos y habilidades.',
    'Demora de 3 a 4 días hábiles desde que tengo toda tu información. No trabajo fines de semana.',
    'Te paso un boceto para ajustarlo juntos. Entregado el CV, tenés 24 hs para pedir cambios sin costo; después, cada cambio cuesta $5.000.',
    'Empiezo a trabajar una vez abonado el monto total.'
  ],
  'Nuevo · Para tu primer trabajo', null, false
)
on conflict (id) do nothing;

insert into public.product_extra_groups (product_id, group_id, sort)
values ('cv-primer-empleo', 'express', 1), ('cv-primer-empleo', 'plataformas', 2)
on conflict do nothing;

-- Sakura (the site's FAQ helper) knows the new pack.
update public.faqs set answer = 'Pack Primer Empleo ({{precio:cv-primer-empleo}}): para quienes buscan su primer trabajo, 1 CV simple y sin foto, optimizado para ATS. Pack Simple ({{precio:cv-simple}}): revisión de tu CV anterior y 2 CV nuevos, uno moderno y uno optimizado para ATS. Pack Medium ({{precio:cv-medium}}): los 2 CV más carta de presentación. Pack Premium ({{precio:cv-premium}}): los 2 CV, carta de presentación y perfil de LinkedIn completo.'
where question = '¿Qué incluye cada pack de CV?';
update public.faqs set sort = sort + 1 where section = 'cv' and sort >= 3;
insert into public.faqs (section, question, answer, keywords, show_on_page, active, sort)
values ('cv', '¿Tienen algo para mi primer trabajo, sin experiencia?',
 '¡Sí! El Pack Primer Empleo ({{precio:cv-primer-empleo}}) es para quienes buscan su primer trabajo: te armo 1 CV profesional, simple y sin foto, que pasa los filtros ATS, destacando tus estudios, cursos, voluntariados y habilidades. Lo tenés en 3 a 4 días hábiles. Si ya trabajaste más de un año, te conviene el Pack Simple ({{precio:cv-simple}}).',
 array['primer','primero','primera vez','sin experiencia','nunca trabaje','nunca trabajé','estudiante','recibido','recien recibido','joven','barato','economico','económico'], true, true, 3);
