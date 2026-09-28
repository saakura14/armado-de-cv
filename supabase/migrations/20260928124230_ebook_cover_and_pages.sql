-- Cover image and page count for the guides, shown in the purchase summary when someone taps "Lo quiero".
-- Covers are the first page of each PDF, saved in public/img/guias/<ebook id>.jpg.
alter table public.ebooks add column cover_url text, add column pages integer check (pages > 0);

update public.ebooks e set cover_url = '/img/guias/' || e.id || '.jpg', pages = v.pages
from (values ('portales-empleo', 11), ('linkedin-reclutadores', 11), ('cv-filtros-ats', 9), ('busqueda-organizada', 11), ('sueldo-negociacion', 10), ('trabajo-remoto', 13)) as v(id, pages)
where e.id = v.id;
