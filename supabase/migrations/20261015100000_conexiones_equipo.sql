-- When the team member has the panel open: one row per visit (entered, last signal, left). His app sends a signal every
-- minute while it is on screen and one when it goes to the background. Only Vale can read it (he can't see it).
create table if not exists public.team_sessions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists team_sessions_member on public.team_sessions (member_id, started_at desc);
alter table public.team_sessions enable row level security;
drop policy if exists "team sessions admin" on public.team_sessions;
create policy "team sessions admin" on public.team_sessions for select to authenticated using ((select public.is_admin()));
alter publication supabase_realtime add table public.team_sessions;

-- p_leaving: the app went to the background or was closed.
create or replace function public.team_heartbeat(p_leaving boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_member uuid := public.my_team_member_id();
  v_session uuid;
begin
  if v_member is null then return; end if;
  -- Visits with no signal for 3 minutes are over: they end at their last signal.
  update public.team_sessions set ended_at = last_seen_at
  where member_id = v_member and ended_at is null and last_seen_at < now() - interval '3 minutes';
  select id into v_session from public.team_sessions where member_id = v_member and ended_at is null order by started_at desc limit 1;
  if p_leaving then
    if v_session is not null then update public.team_sessions set last_seen_at = now(), ended_at = now() where id = v_session; end if;
    return;
  end if;
  if v_session is null then
    insert into public.team_sessions (member_id) values (v_member);
  else
    update public.team_sessions set last_seen_at = now() where id = v_session;
  end if;
end $$;
revoke execute on function public.team_heartbeat(boolean) from public, anon;
grant execute on function public.team_heartbeat(boolean) to authenticated;
