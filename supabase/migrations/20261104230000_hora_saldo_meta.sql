-- When the Meta balance and the account limit were read from Billing, not just the day: meta-ads adds what is spent in
-- the rest of that day (before, a balance noted in the morning missed the whole afternoon's spend).
alter table public.savings_goal
  add column if not exists meta_balance_at timestamptz,
  add column if not exists meta_limit_at timestamptz;

comment on column public.savings_goal.meta_balance_at is 'Momento en que se leyó meta_balance_usd en Facturación (si falta, se supone a las 9).';
comment on column public.savings_goal.meta_limit_at is 'Momento en que se leyó meta_limit_spent_usd en Facturación (si falta, se supone a las 9).';
