-- Her sales are strong Monday to Wednesday: Sundays 20:00 Argentina (23:00 UTC) meta-ads reminds Vale to raise the ads
-- for the strong days; the Thursday 12:00 run (meta-ads-freno) now always reminds her to lower them until Sunday.
select cron.schedule('meta-ads-acelerador', '0 23 * * 0', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/meta-ads',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{"days":1,"boost":true}'::jsonb
  )
$$);
