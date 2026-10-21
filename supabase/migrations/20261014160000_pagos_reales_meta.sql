-- What Meta actually charged (Billing → Actividad de pago): only the charges marked "Pagado" and the prepaid top-ups
-- ("Saldo agregado"). Declined retries ("Error"), spend taken from the prepaid balance and ad credits are not money out.
-- Análisis counts these as the Meta cost; the daily spend (ad_spend) stays for conversations and for the days after
-- the last loaded payment. Claude loads new ones every Monday with the weekly spend.
create table if not exists public.meta_payments (
  ref text primary key,
  day date not null,
  amount_usd numeric(10,2) not null check (amount_usd > 0),
  kind text not null default 'cargo' check (kind in ('cargo', 'saldo')),
  created_at timestamptz not null default now()
);
create index if not exists meta_payments_day on public.meta_payments (day);
alter table public.meta_payments enable row level security;
drop policy if exists "Solo la administradora" on public.meta_payments;
create policy "Solo la administradora" on public.meta_payments for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
alter publication supabase_realtime add table public.meta_payments;

-- Read from her Billing on 14/10 (14/9 to 13/10).
insert into public.meta_payments (ref, day, amount_usd, kind) values
  ('XFBL76SUY4', '2026-09-14', 10.00, 'saldo'), ('9DUR76AVY4', '2026-09-17', 10.00, 'saldo'),
  ('XV33D6AVY4', '2026-09-18', 10.00, 'saldo'), ('GTUAP7NUY4', '2026-09-18', 10.00, 'saldo'), ('TCHT582VY4', '2026-09-18', 1.73, 'cargo'),
  ('EKTCV6SUY4', '2026-09-19', 10.00, 'saldo'), ('LU4AQ6WUY4', '2026-09-19', 10.00, 'saldo'),
  ('SSE6N7EVY4', '2026-09-20', 10.00, 'cargo'), ('TKDQM6AVY4', '2026-09-20', 23.23, 'cargo'),
  ('5KGNV6JVY4', '2026-09-21', 23.00, 'cargo'),
  ('UY7647WUY4', '2026-09-22', 10.00, 'cargo'), ('NK2GB7SUY4', '2026-09-22', 10.00, 'cargo'),
  ('F68SS82VY4', '2026-09-23', 23.01, 'cargo'), ('T6TCA7WUY4', '2026-09-23', 12.00, 'cargo'),
  ('JT8P57AVY4', '2026-09-24', 10.00, 'cargo'), ('PQLA87AVY4', '2026-09-24', 23.00, 'cargo'),
  ('F46EC7AVY4', '2026-09-25', 9.61, 'cargo'), ('JYCK4A6VY4', '2026-09-25', 10.00, 'cargo'),
  ('QAW7Q8NUY4', '2026-09-26', 23.00, 'cargo'), ('5BJPQ7JUY4', '2026-09-26', 11.00, 'cargo'),
  ('LMV8S7WUY4', '2026-09-27', 10.00, 'cargo'),
  ('3JGQF92VY4', '2026-09-28', 10.00, 'cargo'), ('YBCTR7JVY4', '2026-09-28', 13.00, 'cargo'), ('R46HEA6VY4', '2026-09-28', 14.07, 'cargo'),
  ('3U8EY7JVY4', '2026-09-29', 10.00, 'cargo'),
  ('DYG2C8SUY4', '2026-09-30', 22.00, 'cargo'), ('CWEKPA6VY4', '2026-09-30', 2.15, 'cargo'),
  ('4QPT58JVY4', '2026-10-01', 19.00, 'cargo'), ('HYZF48AVY4', '2026-10-01', 23.20, 'cargo'),
  ('EZKUA8JVY4', '2026-10-02', 23.00, 'cargo'), ('5YXC78AVY4', '2026-10-02', 1.15, 'cargo'),
  ('V6E7J8WUY4', '2026-10-03', 26.00, 'cargo'),
  ('AAX6G9EVY4', '2026-10-04', 25.20, 'cargo'), ('XDQBN8WUY4', '2026-10-04', 1.51, 'cargo'),
  ('ZEUTM9EVY4', '2026-10-05', 15.21, 'cargo'),
  ('NNKQS8JVY4', '2026-10-06', 12.00, 'cargo'), ('3RUUHA2VY4', '2026-10-06', 5.77, 'cargo'), ('T7BNT9EVY4', '2026-10-06', 23.00, 'cargo'),
  ('RX7A59WUY4', '2026-10-07', 15.71, 'cargo'),
  ('4CP8TB6VY4', '2026-10-08', 2.87, 'cargo'), ('GK4G29AVY4', '2026-10-08', 17.00, 'cargo'), ('NRG2CANUY4', '2026-10-08', 6.14, 'cargo'),
  ('B5K36AEVY4', '2026-10-09', 6.00, 'cargo'), ('YGW399JVY4', '2026-10-09', 13.00, 'cargo'), ('EUCRFANUY4', '2026-10-09', 23.00, 'cargo'),
  ('55V4F9JUY4', '2026-10-09', 4.89, 'cargo'), ('G92MGANUY4', '2026-10-09', 11.00, 'cargo'),
  ('YRB5KANUY4', '2026-10-10', 10.00, 'cargo'), ('GYPS4C6VY4', '2026-10-10', 23.02, 'cargo'),
  ('5TYG8B2VY4', '2026-10-11', 23.03, 'cargo'), ('7ARY9C6VY4', '2026-10-11', 12.00, 'cargo'),
  ('ZDJTCC6VY4', '2026-10-12', 7.00, 'cargo'), ('X3NYMAEVY4', '2026-10-12', 23.01, 'cargo'),
  ('LD8HX9WUY4', '2026-10-13', 23.03, 'cargo')
on conflict (ref) do nothing;
