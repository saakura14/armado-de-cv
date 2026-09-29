-- Two 1:1 sessions sold on their own: LinkedIn advice (in CV) and interview advice without e-books (in Asesorías).
-- session_minutes makes the order create the session to schedule.
insert into public.products (id, category, name, subtitle, price, delivery, session_minutes, sort, active, popular, highlight, features, notes) values
  ('asesoria-linkedin', 'cv', 'Asesoría de LinkedIn', 'Sesión 1 a 1 por Meet', 30000, 'session', 60, 5, true, false, 'Google Meet con turno previo',
   array['Sesión individual por Google Meet de 60 minutos',
         'Revisamos juntos tu perfil: titular, extracto, experiencia y aptitudes',
         'Tips para que te encuentren los reclutadores y para buscar trabajo con LinkedIn'],
   array['La videollamada por Google Meet se coordina con turno previo.',
         '¿Preferís que te arme el perfil completo? Elegí Perfil de LinkedIn.',
         'Empiezo una vez abonado el monto total.']),
  ('asesoria-entrevista', 'asesorias', 'Asesoría para entrevistas', 'Sesión 1 a 1, sin e-books', 50000, 'session', 90, 12, true, false, 'Google Meet con turno previo',
   array['Sesión individual por Google Meet de 60 a 90 minutos',
         'Simulacro de entrevista o psicotécnico',
         'Feedback personalizado para potenciar tu perfil y gestionar tu ansiedad'],
   array['La videollamada por Google Meet se coordina con turno previo.',
         '¿Querés sumar los 2 e-books? El Pack Premium incluye la sesión y los e-books.']);

-- Order by price in Asesorías: e-book, Pack Plus, Asesoría para entrevistas, Pack Premium.
update public.products set sort = 13 where id = 'asesoria-premium';

-- Sakura's answers mention the new options.
update public.faqs set answer = answer || ' Si preferís armarlo vos con mi guía, la Asesoría de LinkedIn es una sesión 1 a 1 por Meet por {{precio:asesoria-linkedin}}.'
 where question = '¿Hacen el perfil de LinkedIn?' and answer not like '%asesoria-linkedin%';
update public.faqs set answer = answer || ' Si solo querés la sesión 1 a 1, sin e-books, la Asesoría para entrevistas cuesta {{precio:asesoria-entrevista}}.'
 where question = '¿Qué e-books hay y cuánto cuestan?' and answer not like '%asesoria-entrevista%';
