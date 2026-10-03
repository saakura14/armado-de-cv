-- Where each sale came from, to know what the ads bring: chosen by the admin for WhatsApp sales,
-- and set automatically for web orders (an ad link carries fbclid/utm, anything else is the web).
alter table public.orders add column origin text check (origin in ('anuncio', 'instagram', 'recomendacion', 'google', 'web', 'otro'));

create function public.admin_set_order_origin(p_number bigint, p_origin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo administración'; end if;
  update public.orders set origin = nullif(p_origin, ''), updated_at = now() where number = p_number;
end $$;
revoke execute on function public.admin_set_order_origin(bigint, text) from public, anon;
grant execute on function public.admin_set_order_origin(bigint, text) to authenticated;

-- The buyer's own web order, only once and only with the two values the site can know.
create function public.set_my_order_origin(p_order uuid, p_origin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_origin not in ('anuncio', 'web') then return; end if;
  update public.orders set origin = p_origin where id = p_order and user_id = auth.uid() and origin is null;
end $$;
revoke execute on function public.set_my_order_origin(uuid, text) from public, anon;
grant execute on function public.set_my_order_origin(uuid, text) to authenticated;

-- New funnel step: people who went from the web to WhatsApp.
create or replace function public.track_event(p_event text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select public.is_admin()) then return; end if;
  if p_event not in ('lo_quiero', 'checkout', 'whatsapp') then return; end if;
  insert into public.site_events as s (day, event, count)
  values ((now() at time zone 'America/Argentina/Buenos_Aires')::date, p_event, 1)
  on conflict (day, event) do update set count = s.count + 1;
end $$;
