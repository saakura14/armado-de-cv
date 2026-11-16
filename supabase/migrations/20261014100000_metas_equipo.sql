-- What a team member is saving up for with what he earns (zapas, ropa...). He manages his own; Vale sees and edits all.
-- The money counted for a goal is what he earned with CVs finished since `counts_from`, filling the goals in order;
-- a goal marked as bought (done_at) keeps its amount out of what is left for the next ones.
create table if not exists public.team_goals (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members(id) on delete cascade,
  position integer not null default 0,
  label text not null check (length(label) between 1 and 40),
  emoji text not null default '🎯' check (length(emoji) <= 8),
  amount numeric(12,2) not null check (amount > 0),
  counts_from date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists team_goals_member on public.team_goals (member_id, position);
alter table public.team_goals enable row level security;
drop policy if exists "team goals admin" on public.team_goals;
create policy "team goals admin" on public.team_goals for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "team goals own" on public.team_goals;
create policy "team goals own" on public.team_goals for all to authenticated
  using (member_id = (select public.my_team_member_id())) with check (member_id = (select public.my_team_member_id()));

-- Gustavo's first two goals, counting from today (he changes the amounts from his panel).
insert into public.team_goals (member_id, position, label, emoji, amount)
select m.id, g.position, g.label, g.emoji, g.amount
from public.team_members m
cross join (values (0, 'Zapas nuevas', '👟', 150000), (1, 'Ropa nueva', '👕', 120000)) as g(position, label, emoji, amount)
where m.name ilike 'gustavo%' and not exists (select 1 from public.team_goals t where t.member_id = m.id);
