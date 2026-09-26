-- Sign-ups don't require email confirmation, so an email/password account proves nothing about
-- owning the address. The admin role is only granted automatically when the account comes from
-- Google (which verifies the email). Existing admins keep their role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when lower(new.email) in ('ayuda.armadodecv@gmail.com','valeeria.gil@gmail.com')
              and new.raw_app_meta_data->>'provider' = 'google'
         then 'admin' else 'client' end
  );
  return new;
end $$;
