-- New, complete edition of the LinkedIn guide (33 pages): e-book card and product text follow the new content.
update public.ebooks
   set pages = 33,
       description = 'Guía completa: perfil que aparece en las búsquedas, fórmulas de búsqueda, empleos escondidos en publicaciones, 7 formas de postularte y 12 plantillas de mensajes.'
 where id = 'linkedin-reclutadores';

update public.products
   set subtitle = 'Guía completa paso a paso',
       features = array[
         'Perfil que aparece en las búsquedas: titular, "Acerca de" y logros con fórmulas y ejemplos',
         'Búsquedas booleanas listas para copiar y cómo encontrar empleos escondidos en publicaciones',
         '7 formas de postularte, 12 plantillas de mensajes y plan de 4 semanas'
       ]
 where id = 'guia-linkedin';
