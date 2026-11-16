-- How far the team member got in a CV: per text (CV moderno, CV ATS, carta) how many parts he already copied to Canva,
-- and when he last moved. His work mode reports it as he copies; Vale sees it live in the Equipo tab.
alter table public.team_tasks
  add column if not exists progress jsonb not null default '{}'::jsonb,
  add column if not exists progress_at timestamptz;

-- p_progress: { "moderno": [done, total], "ats": [done, total], "carta": [done, total] }.
create or replace function public.team_report_progress(p_task uuid, p_progress jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_member uuid := public.my_team_member_id();
begin
  if v_member is null then raise exception 'Tu cuenta no está habilitada en el equipo'; end if;
  if jsonb_typeof(p_progress) <> 'object' or length(p_progress::text) > 500 then raise exception 'Avance inválido'; end if;
  update public.team_tasks set progress = p_progress, progress_at = now()
  where id = p_task and member_id = v_member and status <> 'terminado' and progress is distinct from p_progress;
end $$;
revoke execute on function public.team_report_progress(uuid, jsonb) from public, anon;
grant execute on function public.team_report_progress(uuid, jsonb) to authenticated;
