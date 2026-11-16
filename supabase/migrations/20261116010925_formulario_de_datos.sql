-- "Tus datos para el CV": every order gets a private link (armadodecv.com/datos/<token>) where the customer answers the
-- questions of the old Google form and uploads their CV and photo. The answers and files stay on the order and come
-- loaded in "Textos con Claude". The customer has no session there: everything goes through the token (functions
-- below), and the files go to cv-sources under forms/<token>/.

create table public.client_forms (
  order_id uuid primary key references public.orders (id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  answers jsonb not null default '{}'::jsonb,
  -- CV and other material for Claude; the photo apart (it is for the modern CV's design, not for the texts).
  files text[] not null default '{}',
  photo text,
  -- When the customer sent it (again, if they edited it later) and when Vale opened it.
  submitted_at timestamptz,
  seen_at timestamptz,
  updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.client_forms enable row level security;
create policy "client forms admin" on public.client_forms for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter publication supabase_realtime add table public.client_forms;

-- Every order gets its form (the panel only offers it on CV and LinkedIn orders); the existing ones too.
create function public.create_client_form() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.client_forms (order_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.create_client_form() from public, anon, authenticated;

create trigger orders_client_form after insert on public.orders
  for each row execute function public.create_client_form();

insert into public.client_forms (order_id) select id from public.orders on conflict do nothing;

-- The form takes answers while the order is going: before paying, while it is being made, and while the LinkedIn of a
-- delivered CV is still to do. Text argument: it is also called from the storage policy with a folder name.
create function public.client_form_open(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.client_forms f
    join public.orders o on o.id = f.order_id
    where f.token::text = p_token
      and (o.status in ('pending_payment', 'payment_review', 'paid', 'in_progress') or (o.status = 'delivered' and o.linkedin_pending))
  );
$$;

-- What the form page shows: the order (number, name, packs) and what the customer already answered.
create function public.client_form_get(p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'number', o.number,
    'customer_name', o.customer_name,
    'customer_phone', o.customer_phone,
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('product_id', i.product_id, 'product_name', i.product_name)), '[]'::jsonb)
      from public.order_items i where i.order_id = o.id
    ),
    'answers', f.answers,
    'files', to_jsonb(f.files),
    'photo', f.photo,
    'submitted_at', f.submitted_at,
    'open', public.client_form_open(p_token::text)
  )
  from public.client_forms f
  join public.orders o on o.id = f.order_id
  where f.token = p_token;
$$;

-- Saves the answers (p_submit: the customer tapped "Enviar"; otherwise it is "Guardar y seguir después").
-- Files must be under the form's own folder, which the storage policy only lets this token write.
create function public.client_form_save(p_token uuid, p_answers jsonb, p_files text[], p_photo text, p_submit boolean)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_prefix text := 'forms/' || p_token::text || '/';
  v_at timestamptz;
begin
  if not public.client_form_open(p_token::text) then
    raise exception 'Este formulario ya está cerrado. Si necesitás cambiar algo, escribime por WhatsApp.';
  end if;
  if jsonb_typeof(p_answers) is distinct from 'object' or length(p_answers::text) > 60000 then
    raise exception 'Las respuestas son demasiado largas.';
  end if;
  if coalesce(cardinality(p_files), 0) > 12 then
    raise exception 'Podés subir hasta 12 archivos.';
  end if;
  if exists (select 1 from unnest(coalesce(p_files, '{}')) as path where left(path, length(v_prefix)) <> v_prefix)
     or (p_photo is not null and left(p_photo, length(v_prefix)) <> v_prefix) then
    raise exception 'Archivo no válido.';
  end if;

  update public.client_forms
  set answers = p_answers,
      files = coalesce(p_files, '{}'),
      photo = p_photo,
      updated_at = now(),
      submitted_at = case when p_submit then now() else submitted_at end
  where token = p_token
  returning submitted_at into v_at;
  return v_at;
end;
$$;

-- The customer's own order page (Mi cuenta) shows the link: only for the owner of the order.
create function public.client_form_token(p_order uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('token', f.token, 'submitted_at', f.submitted_at)
  from public.client_forms f
  join public.orders o on o.id = f.order_id
  where f.order_id = p_order and o.user_id = auth.uid();
$$;

revoke execute on function public.client_form_open(text) from public;
revoke execute on function public.client_form_get(uuid) from public;
revoke execute on function public.client_form_save(uuid, jsonb, text[], text, boolean) from public;
revoke execute on function public.client_form_token(uuid) from public;
grant execute on function public.client_form_open(text) to anon, authenticated;
grant execute on function public.client_form_get(uuid) to anon, authenticated;
grant execute on function public.client_form_save(uuid, jsonb, text[], text, boolean) to anon, authenticated;
grant execute on function public.client_form_token(uuid) to authenticated;

-- Uploads from the form page (no session, or the buyer's): only into the folder of an open form. Nobody but Vale
-- reads cv-sources (its existing admin policy).
create policy "cv sources: client form upload" on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'cv-sources'
    and (storage.foldername(name))[1] = 'forms'
    and public.client_form_open((storage.foldername(name))[2])
  );
