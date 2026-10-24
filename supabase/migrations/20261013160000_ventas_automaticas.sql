-- Sales that close without Vale writing by hand.
-- 1) Test ATS: up to 3 emails (result, how to fix it, last call). Only leads whose first email announced the 3
--    (followup_steps = 3) get the 2nd and 3rd: the ones before this change were told it was the only one.
alter table public.ats_checks
  add column if not exists followup_steps smallint not null default 1,
  add column if not exists followup2_sent_at timestamptz,
  add column if not exists followup3_sent_at timestamptz;

-- 2) Web orders: an email with the payment details right after ordering, and one reminder the next day if unpaid.
alter table public.orders
  add column if not exists order_mail_sent_at timestamptz,
  add column if not exists payment_reminder_sent_at timestamptz;

select cron.schedule('order-mail', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/order-mail',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{}'::jsonb
  )
$$);
