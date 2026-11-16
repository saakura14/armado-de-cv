-- "Análisis" tab: Meta ad spend per day and campaign, next to the sales. Filled by the meta-ads function
-- (Marketing API, every 3 hours) or by hand from the panel. Amounts in the ad account currency (USD).
create table if not exists public.ad_spend (
  day date not null,
  campaign_id text not null,
  campaign_name text not null,
  spend numeric(12,2) not null default 0,
  conversations integer not null default 0,
  clicks integer not null default 0,
  impressions integer not null default 0,
  currency text not null default 'USD',
  source text not null default 'meta' check (source in ('meta', 'manual')),
  updated_at timestamptz not null default now(),
  primary key (day, campaign_id)
);
alter table public.ad_spend enable row level security;
drop policy if exists "Solo la administradora" on public.ad_spend;
create policy "Solo la administradora" on public.ad_spend for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Pesos per dollar per day (dólar cripto, close to what ARQ charges), to compare spend and sales in pesos.
create table if not exists public.fx_rates (
  day date primary key,
  ars_per_usd numeric(12,2) not null check (ars_per_usd > 0),
  source text not null default 'dolarapi-tarjeta',
  updated_at timestamptz not null default now()
);
alter table public.fx_rates enable row level security;
drop policy if exists "Solo la administradora" on public.fx_rates;
create policy "Solo la administradora" on public.fx_rates for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Every 3 hours: the last 3 days of spend (Meta keeps adjusting recent days) and today's rate.
select cron.schedule('meta-ads', '20 */3 * * *', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/meta-ads',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{"days":3}'::jsonb
  )
$$);
