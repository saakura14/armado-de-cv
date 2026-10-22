-- CV delivered but the LinkedIn profile still to do (it often takes longer to coordinate with the client): the order is
-- marked delivered, so the delivery clock stops, and stays in sight with "Falta el LinkedIn" until Vale marks it done.
alter table public.orders add column if not exists linkedin_pending boolean not null default false;

create or replace function public.admin_set_linkedin_pending(p_order uuid, p_pending boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'Solo la administradora'; end if;
  if p_pending then perform public.admin_set_order_status(p_order, 'delivered', null); end if;
  update public.orders set linkedin_pending = p_pending, updated_at = now() where id = p_order;
end $$;
revoke execute on function public.admin_set_linkedin_pending(uuid, boolean) from public, anon;
grant execute on function public.admin_set_linkedin_pending(uuid, boolean) to authenticated;
