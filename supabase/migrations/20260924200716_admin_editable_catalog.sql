alter table public.products
  add column features text[] not null default '{}',
  add column notes text[] not null default '{}',
  add column highlight text,
  add column price_note text,
  add column popular boolean not null default false;

-- CV conditions shown in every CV order
with cv_notes as (select array[
  '1 pack por persona y por rubro: mezclar rubros hace que el CV no funcione con los filtros.',
  'Demora de 3 a 4 días hábiles desde que tengo toda tu información. No trabajo fines de semana.',
  'Si contratás después de las 17 hs, empiezo al día siguiente por la tarde.',
  'Te paso un boceto para ajustarlo juntos. Entregado el CV, tenés 24 hs para pedir cambios sin costo; después, cada cambio cuesta $5.000.',
  'Empiezo a trabajar una vez abonado el monto total.'
]::text[] as n)
update public.products p set notes = cv_notes.n from cv_notes where p.category = 'cv';

update public.products set features = array['Revisión de tu CV anterior','2 CV nuevos: uno moderno + uno optimizado para filtros ATS (mismo rubro)'] where id='cv-simple';
update public.products set popular = true, features = array['2 CV nuevos: uno moderno + uno optimizado para filtros ATS','Carta de presentación'] where id='cv-medium';
update public.products set features = array['Armado de perfil de LinkedIn completo','2 CV nuevos: uno moderno + uno optimizado para filtros ATS (mismo rubro)','Carta de presentación'] where id='cv-premium';
update public.products set features = array['Armado de tu perfil de LinkedIn completo','Titular, extracto, experiencia y aptitudes pensados para que te encuentren los reclutadores','¿También necesitás CV? El Pack Premium incluye LinkedIn'] where id='linkedin';
update public.products set price_note = 'c/u',
  features = array['Guía práctica en formato Word','Lectura desde celular, tablet o computadora','Ejercitación guiada de preparación incluida'],
  notes = array['Lo descargás desde "Mi cuenta" apenas confirmo tu pago.'] where id='ebook';
update public.products set popular = true,
  features = array['E-book de asesoría integral para entrevistas laborales','E-book de asesoría integral para tests laborales','Ejercitación guiada de preparación incluida'],
  notes = array['Los descargás desde "Mi cuenta" apenas confirmo tu pago.'] where id='asesoria-plus';
update public.products set highlight = 'Google Meet con turno previo',
  features = array['Los 2 e-books completos','Sesión individual por Google Meet de 60 a 90 minutos','Feedback personalizado para potenciar tu perfil y gestionar tu ansiedad'],
  notes = array['La videollamada por Google Meet se coordina con turno previo.','Los e-books los descargás desde "Mi cuenta" apenas confirmo tu pago.'] where id='asesoria-premium';
update public.products set subtitle = 'CHASIDE + Test Vocacional versión profesional adaptada (TV-A)',
  features = array['Administración de la batería específica de tests','Devolución de resultados por correo electrónico'],
  notes = array['Este instrumento no constituye diagnóstico ni evaluación psicométrica estandarizada. Debe utilizarse como herramienta de orientación.'] where id='test-vocacional';

-- Email on profiles so the admin panel can show who bought
alter table public.profiles add column email text;
update public.profiles p set email = u.email from auth.users u where u.id = p.id;
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when lower(new.email) in ('ayuda.armadodecv@gmail.com','valeeria.gil@gmail.com') then 'admin' else 'client' end
  );
  return new;
end $$;

-- Transfer details: only visible to signed-in customers (shown at checkout)
create table public.payment_settings (
  id integer primary key default 1 check (id = 1),
  alias text not null,
  cbu text not null,
  holder text not null,
  bank text,
  updated_at timestamptz not null default now()
);
insert into public.payment_settings (alias, cbu, holder) values ('armado.cv','<CBU: se carga en Supabase, no se publica>','Valeria Yanina Gil');
alter table public.payment_settings enable row level security;
create policy "payment read signed in" on public.payment_settings for select to authenticated using (true);
create policy "payment admin update" on public.payment_settings for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Terms acceptance is required to order
alter table public.orders add column terms_accepted_at timestamptz;
