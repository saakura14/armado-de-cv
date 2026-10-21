-- Every expense of the business in one place (Análisis → Gastos), besides Meta ads (ad_spend) and the team
-- (team_tasks.rate), which are counted on their own. Monthly ones (Canva, dominio, etc.) repeat every month
-- from their date until `until` (null = still running). Amounts in pesos or dollars (converted with the dólar tarjeta).
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  day date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  category text not null check (category in ('publicidad', 'herramientas', 'servicios', 'impuestos', 'equipo', 'otros')),
  concept text not null check (length(trim(concept)) between 1 and 120),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'ARS' check (currency in ('ARS', 'USD')),
  monthly boolean not null default false,
  until date,
  created_at timestamptz not null default now()
);
alter table public.expenses enable row level security;
drop policy if exists "Solo la administradora" on public.expenses;
create policy "Solo la administradora" on public.expenses for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
