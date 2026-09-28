-- Real orders keep a clean sequence (#1, #2, ...). Orders placed from the admin account (tests)
-- take numbers from 90100 up, so testing never skips a real number.
alter table public.orders alter column number drop identity if exists;

create sequence if not exists public.orders_real_number_seq;
select setval('public.orders_real_number_seq', coalesce((select max(number) from public.orders where number < 90000), 0) + 1, false);
create sequence if not exists public.orders_test_number_seq start with 90100;
select setval('public.orders_test_number_seq', greatest(90100, coalesce((select max(number) from public.orders where number >= 90000), 0) + 1), false);

create function public.set_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.number is null then
    new.number := case
      when exists (select 1 from public.profiles where id = new.user_id and role = 'admin') then nextval('public.orders_test_number_seq')
      else nextval('public.orders_real_number_seq')
    end;
  end if;
  return new;
end $$;

revoke execute on function public.set_order_number() from public, anon, authenticated;
create trigger orders_set_number before insert on public.orders for each row execute function public.set_order_number();
alter table public.orders alter column number set not null;
