-- The PDF is uploaded: show the remote-work guide in the store.
update public.products set active = true where id = 'guia-remoto' and exists (select 1 from public.ebooks where id = 'trabajo-remoto' and file_path is not null);
