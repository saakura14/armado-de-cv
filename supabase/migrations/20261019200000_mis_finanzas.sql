-- "Mis finanzas": Vale's personal money, apart from the business. Only the admin sees it (the amounts and names are
-- loaded straight into the database, never into this public repo).
--
-- personal_items: what comes back every month or has a plan.
--   fijo   = an income or expense each month (amount null when it changes: luz, tarjeta), with its due day.
--   cuotas = a plan of installments ({ n, due, amount, est? }), like a loan or the school enrollment.
--   deuda  = money owed to someone without a fixed plan: total, what was paid before loading it, and the payments after.
-- personal_moves: what actually came in or went out. A move tied to an item pays it for a month (period 'YYYY-MM') or
-- an installment; the rest are day-to-day expenses. 'entre_cuentas' are transfers between her own accounts (not spent).
create table if not exists public.personal_items (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('ingreso', 'gasto')),
  type text not null default 'fijo' check (type in ('fijo', 'cuotas', 'deuda')),
  name text not null,
  category text not null default 'otros',
  amount numeric check (amount is null or amount >= 0),
  due_day integer check (due_day is null or due_day between 1 and 31),
  due_note text,
  account text,
  plan jsonb,
  installments_total integer,
  total numeric check (total is null or total > 0),
  paid_before numeric not null default 0,
  notes text,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.personal_moves (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  kind text not null check (kind in ('ingreso', 'gasto', 'entre_cuentas')),
  item_id uuid references public.personal_items(id) on delete set null,
  period text check (period is null or period ~ '^\d{4}-\d{2}$'),
  installment integer,
  category text not null default 'otros',
  concept text not null,
  amount numeric not null check (amount > 0),
  account text,
  scope text not null default 'personal' check (scope in ('personal', 'negocio')),
  source text not null default 'panel',
  created_at timestamptz not null default now()
);
create index if not exists personal_moves_day on public.personal_moves (day);
create index if not exists personal_moves_item on public.personal_moves (item_id);

alter table public.personal_items enable row level security;
alter table public.personal_moves enable row level security;
drop policy if exists "Solo la administradora" on public.personal_items;
create policy "Solo la administradora" on public.personal_items for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "Solo la administradora" on public.personal_moves;
create policy "Solo la administradora" on public.personal_moves for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Every morning at 9 (Argentina): what is due in the next 2 days and isn't paid yet arrives as a notification.
select cron.unschedule('personal-reminders') where exists (select 1 from cron.job where jobname = 'personal-reminders');
select cron.schedule('personal-reminders', '0 12 * * *', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/personal-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{}'::jsonb
  )
$$);

-- Weekly "salary" from the business: everything stays in Ualá (it earns daily interest), so business and personal money
-- are split on paper. Each Monday the previous week's profit is either taken out by Vale (amount) or partly kept as the
-- business cushion (to_cushion; negative when a losing week used it).
alter table public.savings_goal add column if not exists cushion_target numeric not null default 200000 check (cushion_target >= 0);
create table if not exists public.business_withdrawals (
  week date primary key,
  profit numeric not null,
  to_cushion numeric not null default 0,
  amount numeric not null default 0 check (amount >= 0),
  day date not null,
  created_at timestamptz not null default now()
);
alter table public.business_withdrawals enable row level security;
drop policy if exists "Solo la administradora" on public.business_withdrawals;
create policy "Solo la administradora" on public.business_withdrawals for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
