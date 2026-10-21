-- "LinkedIn con Claude": for the "Perfil de LinkedIn" pack and the Premium pack, Claude writes the whole profile (titular,
-- acerca de, each experience, aptitudes, formación, idiomas, abierto a trabajar, URL) from the client's material, and Vale
-- copies each block into LinkedIn. Same flow as cv_drafts: the scheduled Claude task picks up "pedido" and "corregir".

create table public.linkedin_drafts (
  order_item_id uuid primary key references public.order_items (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  source_text text not null default '',
  target_job text,
  files text[] not null default '{}',
  status text not null default 'pedido' check (status in ('pedido', 'generando', 'corregir', 'listo', 'error')),
  -- [{ "label": "Titular", "text": "..." }, ...] in the order they go in LinkedIn.
  sections jsonb,
  feedback text,
  feedback_files text[] not null default '{}',
  error text,
  requested_at timestamptz not null default now(),
  generated_at timestamptz
);
create index linkedin_drafts_status_idx on public.linkedin_drafts (status, requested_at);
create index linkedin_drafts_order_idx on public.linkedin_drafts (order_id);

alter table public.linkedin_drafts enable row level security;
create policy "linkedin drafts admin" on public.linkedin_drafts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

alter publication supabase_realtime add table public.linkedin_drafts;
