-- "Textos con Claude": a correction can carry images (screenshots pasted or uploaded by Vale) that show what to fix.
-- They live in the private bucket cv-sources, next to the client's files.
alter table public.cv_drafts add column feedback_files text[] not null default '{}';
