-- The PDF is uploaded: show the salary guide in the store.
update public.products set active = true where id = 'guia-sueldo' and exists (select 1 from public.ebooks where id = 'sueldo-negociacion' and file_path is not null);
