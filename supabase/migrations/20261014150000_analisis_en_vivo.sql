-- The Análisis tab updates by itself when an expense or ad spend changes (orders were already published).
-- RLS still applies: only the admin receives these changes.
alter publication supabase_realtime add table public.expenses, public.ad_spend;
