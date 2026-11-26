-- "Reiniciar textos" on a CV pack (Vale loaded another person's material by mistake): the pack goes back to zero.
-- If the team member already built it, Vale can still pay that work: the task stays in the member's history and
-- payments, but no longer tied to the pack (order_item_id and order_id null), so the pack can be assigned again.
alter table public.team_tasks alter column order_item_id drop not null;
alter table public.team_tasks alter column order_id drop not null;
