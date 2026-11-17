-- Files Vale shares to the panel from WhatsApp go with the customer's form, under forms/<token>/whatsapp/. When the
-- customer saves their form afterwards (their page may still list the files from before), those stay.
create or replace function public.client_form_save(p_token uuid, p_answers jsonb, p_files text[], p_photo text, p_submit boolean)
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
      files = coalesce(p_files, '{}') || array(
        select path from unnest(files) as path
        where path like v_prefix || 'whatsapp/%' and not path = any (coalesce(p_files, '{}'))
      ),
      photo = p_photo,
      updated_at = now(),
      submitted_at = case when p_submit then now() else submitted_at end
  where token = p_token
  returning submitted_at into v_at;
  return v_at;
end;
$$;
