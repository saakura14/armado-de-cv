-- One email about the job board (/empleos) for the test leads who got a single email (before the 3-email sequence
-- existed): they end with 2, under the "3 como máximo" the emails promise. Sent by ats-followup.
alter table public.ats_checks add column if not exists bolsa_sent_at timestamptz;
comment on column public.ats_checks.bolsa_sent_at is 'Mail de la bolsa de búsquedas (/empleos): solo para quienes recibieron 1 mail del test (antes de la secuencia de 3), así nadie pasa de 3.';
