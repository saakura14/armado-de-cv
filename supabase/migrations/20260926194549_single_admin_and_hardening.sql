-- Only the existing admin account (valeeria.gil@gmail.com) is admin. Every new account is a client;
-- adding another admin is a deliberate manual change in the database.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    'client'
  );
  return new;
end $$;

-- Clients may edit their name, phone and avatar, but never their role or the email shown to the admin.
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    if new.role is distinct from old.role then raise exception 'No podés cambiar tu rol'; end if;
    if new.email is distinct from old.email then raise exception 'El email se cambia desde tu cuenta de ingreso'; end if;
  end if;
  return new;
end $$;

-- Anti-spam: at most 5 unpaid orders per person in the last 24 hours.
create or replace function public.limit_unpaid_orders() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.orders
       where user_id = new.user_id and status = 'pending_payment' and created_at > now() - interval '24 hours') >= 5 then
    raise exception 'Tenés varios pedidos sin pagar. Completá uno o escribinos por WhatsApp.';
  end if;
  return new;
end $$;
create trigger orders_limit_unpaid before insert on public.orders
  for each row execute function public.limit_unpaid_orders();
revoke execute on function public.limit_unpaid_orders() from public, anon, authenticated;
