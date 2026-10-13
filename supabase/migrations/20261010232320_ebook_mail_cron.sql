-- Every 10 minutes: email the download link to buyers without an account once their guides are unlocked.
select cron.schedule('ebook-mail', '*/10 * * * *', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/ebook-mail',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{}'::jsonb
  )
$$);
