-- Plan to spend less on Meta (19/10): the rules the weekly review uses, kept with the savings goal so they can change
-- without a deploy, and the alerts already sent (so the balance alert arrives once per billing cycle).
alter table public.savings_goal
  add column if not exists balance_alert_usd numeric not null default 75 check (balance_alert_usd > 0),
  add column if not exists weekly_cap_usd numeric not null default 80 check (weekly_cap_usd > 0),
  add column if not exists max_per_conversation_usd numeric not null default 0.40 check (max_per_conversation_usd > 0),
  add column if not exists target_per_sale_usd numeric not null default 6 check (target_per_sale_usd > 0);

-- Daily cap of the plan: Copia (6) + Mensajes (5) = 11, about US$77 a week (Toyota's 7 run until 21/10 on top).
update public.savings_goal set ad_cap_usd = 11, updated_at = now() where id = 1;

create table if not exists public.ad_alerts (
  key text primary key,
  sent_at timestamptz not null default now()
);
alter table public.ad_alerts enable row level security;
drop policy if exists "Solo la administradora" on public.ad_alerts;
create policy "Solo la administradora" on public.ad_alerts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
