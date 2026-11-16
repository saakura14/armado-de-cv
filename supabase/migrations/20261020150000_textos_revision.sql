-- "Textos con Claude": Vale reviews the texts before assigning them and can ask Claude for a correction ("corregir" +
-- what to fix). Word files are accepted too.

alter table public.cv_drafts add column feedback text;
alter table public.cv_drafts drop constraint cv_drafts_status_check;
alter table public.cv_drafts add constraint cv_drafts_status_check check (status in ('pedido', 'generando', 'corregir', 'listo', 'error'));

update storage.buckets set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/heic','application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword'
] where id = 'cv-sources';
