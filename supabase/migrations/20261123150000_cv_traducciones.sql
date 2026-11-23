-- CVs in another language (the "idiomas" extra of a pack): the same CV moderno and CV ATS, translated to each language the
-- client asked for, travel with the Spanish texts. Claude writes them with the Spanish ones (cv_drafts), Vale reviews them,
-- they go to the team member with the task (team_tasks) and to Claude's Canva build (cv_builds).
-- Each element: {"language": "Inglés", "cv_modern": "...", "cv_ats": "..."} (cv_modern is '' in the ATS-only pack).
-- The cover letter is never translated (the language pages are CV pages only).
alter table public.cv_drafts add column translations jsonb not null default '[]'::jsonb;
alter table public.team_tasks add column translations jsonb not null default '[]'::jsonb;
alter table public.cv_builds add column translations jsonb not null default '[]'::jsonb;
