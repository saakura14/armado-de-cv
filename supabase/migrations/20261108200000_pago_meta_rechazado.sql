-- When Meta tries to charge the balance and the card declines it, the ads stop soon: meta-ads can't see that (it
-- assumes the automatic charge went through), so it's noted by hand from Billing and the panel shows it in red.
alter table public.savings_goal
  add column if not exists meta_declined_usd numeric,
  add column if not exists meta_declined_at timestamptz;

comment on column public.savings_goal.meta_declined_usd is 'Saldo que Meta intentó cobrar y la tarjeta rechazó (los anuncios se cortan). Se borra con "Ya pagué".';
comment on column public.savings_goal.meta_declined_at is 'Cuándo se vio el rechazo en Facturación.';
