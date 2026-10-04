-- Each payment says exactly which finished CVs it covers (the oldest unpaid ones), so packs finished
-- before the payment is registered but after the batch don't get counted as paid.
alter table public.team_tasks add column paid_in uuid references public.team_payments (id) on delete set null;
-- Advances are settled by the next payment.
alter table public.team_payments add column packs integer check (packs >= 0), add column settled_in uuid references public.team_payments (id) on delete set null;
create index team_tasks_unpaid_idx on public.team_tasks (member_id, finished_at) where status = 'terminado' and paid_in is null;

create function public.admin_team_pay(p_member uuid, p_packs integer, p_amount integer, p_note text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_payment uuid;
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  if p_packs < 0 or p_amount < 0 then raise exception 'Datos inválidos'; end if;
  insert into public.team_payments (member_id, kind, amount, note, packs) values (p_member, 'pago', p_amount, nullif(trim(p_note), ''), p_packs)
  returning id into v_payment;
  update public.team_tasks set paid_in = v_payment
  where id in (select id from public.team_tasks where member_id = p_member and status = 'terminado' and paid_in is null order by finished_at limit p_packs);
  update public.team_payments set settled_in = v_payment where member_id = p_member and kind = 'adelanto' and settled_in is null;
  return v_payment;
end $$;
revoke execute on function public.admin_team_pay(uuid, integer, integer, text) from public, anon;
grant execute on function public.admin_team_pay(uuid, integer, integer, text) to authenticated;
