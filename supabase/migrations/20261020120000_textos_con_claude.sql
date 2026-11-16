-- "Textos con Claude": on each CV pack Vale leaves the client's material (base CV, form answers, files, target job, what
-- the client asked) and asks for the texts. A scheduled Claude task on her computer picks up the pending ones, writes the
-- modern CV, the ATS CV and the letter with her master prompt, and saves them here; the assign dialog comes pre-filled.

create table public.cv_drafts (
  order_item_id uuid primary key references public.order_items (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  source_text text not null default '',
  target_job text,
  files text[] not null default '{}',
  has_letter boolean not null default false,
  ats_only boolean not null default false,
  status text not null default 'pedido' check (status in ('pedido', 'generando', 'listo', 'error')),
  cv_modern text,
  cv_ats text,
  letter text,
  error text,
  requested_at timestamptz not null default now(),
  generated_at timestamptz
);
create index cv_drafts_status_idx on public.cv_drafts (status, requested_at);
create index cv_drafts_order_idx on public.cv_drafts (order_id);

alter table public.cv_drafts enable row level security;
create policy "cv drafts admin" on public.cv_drafts for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

alter publication supabase_realtime add table public.cv_drafts;

-- The client's files (PDF or photos of the base CV): private, only Vale.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('cv-sources', 'cv-sources', false, 15728640, array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

create policy "cv sources: admin" on storage.objects for all to authenticated
  using (bucket_id = 'cv-sources' and (select public.is_admin()))
  with check (bucket_id = 'cv-sources' and (select public.is_admin()));
