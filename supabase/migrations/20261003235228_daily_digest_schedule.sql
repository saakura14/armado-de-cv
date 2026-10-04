-- Morning summary (push) Monday to Saturday at 9:00 Argentina (12:00 UTC), sent by the daily-digest function.
-- The function only runs with this private key, kept in Vault.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'cron_key', 'Key the scheduler sends to the daily-digest function')
where not exists (select 1 from vault.secrets where name = 'cron_key');

create or replace function public.cron_key() returns text
language sql stable security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cron_key'
$$;
revoke execute on function public.cron_key() from public, anon, authenticated;
grant execute on function public.cron_key() to service_role;

select cron.schedule('daily-digest', '0 12 * * 1-6', $$
  select net.http_post(
    url := 'https://wdcijkjmdfypltbafdol.supabase.co/functions/v1/daily-digest',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-key', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_key')),
    body := '{}'::jsonb
  )
$$);
