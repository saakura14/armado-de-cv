-- Live updates in the admin panel: changes to orders are streamed through Realtime.
-- Row Level Security still applies, so each person only receives the orders they can read (the admin, all of them).
alter publication supabase_realtime add table public.orders;
