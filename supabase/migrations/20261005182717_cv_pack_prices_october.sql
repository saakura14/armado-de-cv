-- New prices for the CV packs (October 2026). Orders already placed keep the price they were created with.
update public.products set price = 35000 where id = 'cv-simple';
update public.products set price = 37000 where id = 'cv-medium';
update public.products set price = 65000 where id = 'cv-premium';
