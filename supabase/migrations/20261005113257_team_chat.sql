-- Chat between Vale and each team member, inside the panel (instead of WhatsApp for work questions).
create table public.team_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members(id) on delete cascade,
  sender text not null check (sender in ('admin', 'member')),
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  -- Optional: the CV the message is about ("Duda con el pedido #18").
  task_id uuid references public.team_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index team_messages_member_created on public.team_messages (member_id, created_at desc);
create index team_messages_unread on public.team_messages (member_id, sender) where read_at is null;

alter table public.team_messages enable row level security;

-- Vale sees and writes every conversation.
create policy "team messages admin" on public.team_messages for all
  using ((select public.is_admin())) with check ((select public.is_admin()) and sender = 'admin');
-- A member sees their own conversation and only writes as themselves.
create policy "team messages own read" on public.team_messages for select
  using (member_id = (select public.my_team_member_id()));
create policy "team messages own write" on public.team_messages for insert
  with check (member_id = (select public.my_team_member_id()) and sender = 'member');

-- Marks as read what the other side wrote (the only update anyone needs).
create or replace function public.team_chat_mark_read(p_member uuid) returns integer
language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  if public.is_admin() then
    update public.team_messages set read_at = now() where member_id = p_member and sender = 'member' and read_at is null;
  elsif p_member = public.my_team_member_id() then
    update public.team_messages set read_at = now() where member_id = p_member and sender = 'admin' and read_at is null;
  else
    raise exception 'No es tu conversación';
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end $$;
revoke all on function public.team_chat_mark_read(uuid) from public, anon;
grant execute on function public.team_chat_mark_read(uuid) to authenticated;

alter publication supabase_realtime add table public.team_messages;
