-- Sakura answers urgent requests: Express, or a specific time quoted by WhatsApp.
update public.faqs
   set answer = answer || ' ¿Lo necesitás para un horario puntual (por ejemplo, para hoy)? Escribime por WhatsApp con el horario y te cotizo en el momento según disponibilidad.',
       keywords = (select array_agg(distinct k) from unnest(keywords || array['hoy','horario','urgencia','ya','mañana','cuanto antes']) k)
 where id = '976907e8-0579-4bbd-a5bd-bfccfef542f9' and answer not like '%horario puntual%';
