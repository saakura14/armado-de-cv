-- Thursdays 12:00 Argentina (15:00 UTC): if the week runs at US$23 and the ads brought fewer than 3 sales since Monday,
-- meta-ads pushes Vale a warning to drop to US$15 until the Monday review.
select cron.schedule('meta-ads-freno', '0 15 * * 4', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/meta-ads',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{"days":1,"brake":true}'::jsonb
  )
$$);
