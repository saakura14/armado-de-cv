-- The Meta account spending limit Vale set in Billing (US$75 on 2/11) so Meta never charges more than she has: when the
-- spend since its last reset reaches it, the ads stop. meta-ads tracks it like the balance (what Billing showed on a day,
-- plus the spend after it, loaded or estimated with the budgets) and warns when US$15 and US$5 are left. The latest
-- balance and limit it computed are kept in meta_status, for the urgent bar of the panel.
alter table public.savings_goal
  add column if not exists meta_limit_usd numeric,
  add column if not exists meta_limit_spent_usd numeric,
  add column if not exists meta_limit_on date,
  add column if not exists meta_status jsonb,
  add column if not exists meta_status_at timestamptz;

comment on column public.savings_goal.meta_limit_usd is 'Límite de gasto de la cuenta de Meta (Facturación): al llegar, Meta corta los anuncios hasta que se restablezca.';
comment on column public.savings_goal.meta_limit_spent_usd is 'Lo gastado contra ese límite, leído de Facturación el día meta_limit_on.';
comment on column public.savings_goal.meta_status is 'Último saldo y límite calculados por meta-ads ({ balance, limit }), para la barra urgente del panel.';
