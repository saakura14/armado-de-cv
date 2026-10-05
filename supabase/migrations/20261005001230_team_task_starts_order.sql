-- Assigning a CV to the team means the work started: a paid order moves to "En proceso".
-- In the database so it works from any device, even one still running an older version of the panel.
create or replace function public.team_task_starts_order() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.orders set
    status = 'in_progress',
    payment_check = case when payment_check = 'pending' then 'ok' else payment_check end,
    updated_at = now()
  where id = new.order_id and status = 'paid';
  return new;
end $$;

revoke all on function public.team_task_starts_order() from public, anon, authenticated;

create trigger team_task_starts_order
after insert on public.team_tasks
for each row execute function public.team_task_starts_order();

-- The ones assigned before this existed.
update public.orders o set status = 'in_progress', updated_at = now()
where o.status = 'paid' and exists (select 1 from public.team_tasks t where t.order_id = o.id);
