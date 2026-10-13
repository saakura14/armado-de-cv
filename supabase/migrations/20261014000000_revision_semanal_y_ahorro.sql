-- Meta campaigns as they are now (status and daily budget, in USD), refreshed by the meta-ads function.
create table if not exists public.ad_campaigns (
  id text primary key,
  name text not null,
  status text not null,
  daily_budget numeric(12,2),
  updated_at timestamptz not null default now()
);
alter table public.ad_campaigns enable row level security;
drop policy if exists "Solo la administradora" on public.ad_campaigns;
create policy "Solo la administradora" on public.ad_campaigns for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Weekly review of the ads (Mondays): what was spent, what it brought and what to change. Written by meta-ads.
create table if not exists public.ad_reviews (
  week date primary key,
  stats jsonb not null,
  advice jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.ad_reviews enable row level security;
drop policy if exists "Solo la administradora" on public.ad_reviews;
create policy "Solo la administradora" on public.ad_reviews for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Savings goal from the business profit (one row) and every transfer to savings.
create table if not exists public.savings_goal (
  id integer primary key default 1 check (id = 1),
  target numeric(14,2) not null default 10000000,
  save_share integer not null default 60 check (save_share between 0 and 100),
  live_share integer not null default 25 check (live_share between 0 and 100),
  ad_cap_usd numeric(8,2) not null default 23,
  updated_at timestamptz not null default now(),
  check (save_share + live_share <= 100)
);
insert into public.savings_goal (id) values (1) on conflict do nothing;
alter table public.savings_goal enable row level security;
drop policy if exists "Solo la administradora" on public.savings_goal;
create policy "Solo la administradora" on public.savings_goal for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create table if not exists public.savings_moves (
  id uuid primary key default gen_random_uuid(),
  day date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  amount numeric(14,2) not null check (amount <> 0),
  note text check (note is null or length(note) <= 120),
  created_at timestamptz not null default now()
);
alter table public.savings_moves enable row level security;
drop policy if exists "Solo la administradora" on public.savings_moves;
create policy "Solo la administradora" on public.savings_moves for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Mondays 9:00 Argentina (12:00 UTC): weekly ads review and push to Vale.
select cron.schedule('meta-ads-weekly', '0 12 * * 1', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/meta-ads',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{"days":7,"weekly":true}'::jsonb
  )
$$);
