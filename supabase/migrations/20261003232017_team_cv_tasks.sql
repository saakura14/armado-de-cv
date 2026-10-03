-- Team: people who build the CVs in Canva from the texts Vale writes. They sign in with Google at /equipo
-- and only see their own tasks and payments: never prices, customer contact details or other orders.

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  -- What each CV pack pays (each task keeps the rate of the day it was assigned).
  rate integer not null default 7000 check (rate >= 0),
  -- Packs per payment: "7 of 10" counter on both screens.
  batch_size integer not null default 10 check (batch_size > 0),
  active boolean not null default true,
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- One task per CV pack of an order (two packs = two tasks). Extras like languages are not paid apart.
create table public.team_tasks (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members (id),
  order_id uuid not null references public.orders (id) on delete cascade,
  order_item_id uuid not null unique references public.order_items (id) on delete cascade,
  order_number bigint not null,
  client_name text not null,
  pack_name text not null,
  cv_modern text not null,
  cv_ats text not null,
  has_letter boolean not null default false,
  letter text,
  notes text,
  due_on date,
  status text not null default 'asignado' check (status in ('asignado', 'haciendo', 'terminado')),
  rate integer not null check (rate >= 0),
  assigned_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  design_url text
);
create index team_tasks_member_idx on public.team_tasks (member_id, status, finished_at);
create index team_tasks_order_idx on public.team_tasks (order_id);

-- "pago" closes the batch (the 10-pack counter starts again); "adelanto" is money ahead, discounted from the current batch.
create table public.team_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members (id),
  kind text not null check (kind in ('pago', 'adelanto')),
  amount integer not null check (amount >= 0),
  paid_on date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  note text,
  created_at timestamptz not null default now()
);
create index team_payments_member_idx on public.team_payments (member_id, created_at);

-- The team member signed in right now (matched by the Google account's email), or null.
create function public.my_team_member_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.team_members
  where active and email = lower(coalesce((select email from auth.users where id = auth.uid()), ''))
$$;
revoke execute on function public.my_team_member_id() from public, anon;
grant execute on function public.my_team_member_id() to authenticated;

alter table public.team_members enable row level security;
alter table public.team_tasks enable row level security;
alter table public.team_payments enable row level security;

create policy "team members admin" on public.team_members for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "team members own" on public.team_members for select to authenticated using (id = (select public.my_team_member_id()));
create policy "team tasks admin" on public.team_tasks for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "team tasks own" on public.team_tasks for select to authenticated using (member_id = (select public.my_team_member_id()));
create policy "team payments admin" on public.team_payments for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "team payments own" on public.team_payments for select to authenticated using (member_id = (select public.my_team_member_id()));

-- On first sign-in the member's account is linked (so notifications reach their phone).
create function public.team_link_account()
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_member uuid := public.my_team_member_id();
begin
  if v_member is not null then
    update public.team_members set user_id = auth.uid() where id = v_member and user_id is distinct from auth.uid();
  end if;
  return v_member;
end $$;
revoke execute on function public.team_link_account() from public, anon;
grant execute on function public.team_link_account() to authenticated;

-- The member moves only their own tasks: "Empecé" and "Terminé" (the pack counts when it is finished).
create function public.team_set_task_status(p_task uuid, p_status text, p_design_url text default null)
returns text language plpgsql security definer set search_path = '' as $$
declare v_member uuid := public.my_team_member_id();
begin
  if v_member is null then raise exception 'Tu cuenta no está habilitada en el equipo'; end if;
  if p_status not in ('asignado', 'haciendo', 'terminado') then raise exception 'Estado inválido'; end if;
  if p_design_url is not null and trim(p_design_url) <> '' and p_design_url !~* '^https?://' then raise exception 'El link tiene que empezar con https://'; end if;
  -- A finished pack already counts for the payment: only Vale can reopen it.
  if exists (select 1 from public.team_tasks where id = p_task and member_id = v_member and status = 'terminado') then
    raise exception 'Este CV ya está terminado. Si hay que cambiar algo, avisale a Vale.';
  end if;
  update public.team_tasks set
    status = p_status,
    started_at = case when p_status <> 'asignado' then coalesce(started_at, now()) else null end,
    finished_at = case when p_status = 'terminado' then coalesce(finished_at, now()) else null end,
    design_url = coalesce(nullif(trim(p_design_url), ''), design_url)
  where id = p_task and member_id = v_member;
  if not found then raise exception 'No encontré esa tarea'; end if;
  return p_status;
end $$;
revoke execute on function public.team_set_task_status(uuid, text, text) from public, anon;
grant execute on function public.team_set_task_status(uuid, text, text) to authenticated;
