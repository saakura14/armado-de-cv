-- The team screen and the admin's Equipo tab update live (RLS still decides who sees each row).
alter publication supabase_realtime add table public.team_tasks, public.team_payments;
