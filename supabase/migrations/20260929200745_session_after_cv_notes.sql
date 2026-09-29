-- First the CV, then the session: tell customers before they buy.
update public.products
   set notes = notes || array['Si la sumás a un pack de CV, la sesión la coordinamos cuando te entrego el CV, así la preparamos con tu CV nuevo.']
 where id in ('asesoria-linkedin', 'asesoria-entrevista', 'asesoria-premium')
   and not exists (select 1 from unnest(notes) n where n like '%cuando te entrego el CV%');
