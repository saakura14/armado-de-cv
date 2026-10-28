-- "Armarlo yo": Vale builds a CV pack herself (an urgent one, or when the team can't) without copying and pasting in Canva.
-- From the panel she leaves the texts and whether the design is the women's or the men's; the pages and languages come
-- from the pack. The scheduled Claude task on her computer copies the right base template in Canva (never the original),
-- names it "Cv - NOMBRE APELLIDO", replaces every text and saves the client's own link here.

create table public.cv_builds (
  order_item_id uuid primary key references public.order_items (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  client_name text not null,
  gender text not null check (gender in ('mujer', 'hombre')),
  -- The CV pages in Spanish ('moderno', 'ats', 'carta'), and the languages whose CV pages are added after them.
  pages text[] not null,
  languages text[] not null default '{}',
  cv_modern text not null default '',
  cv_ats text not null,
  letter text,
  notes text,
  status text not null default 'pedido' check (status in ('pedido', 'armando', 'listo', 'error')),
  design_id text,
  edit_url text,
  error text,
  requested_at timestamptz not null default now(),
  built_at timestamptz
);
create index cv_builds_status_idx on public.cv_builds (status, requested_at);
create index cv_builds_order_idx on public.cv_builds (order_id);

alter table public.cv_builds enable row level security;
create policy "cv builds admin" on public.cv_builds for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

alter publication supabase_realtime add table public.cv_builds;

-- The base designs: copies of real client CVs with room for 3 experiences, page 1 modern CV, page 2 ATS CV, page 3 letter.
-- The task copies only the pages the pack needs. Vale can swap a template by changing its design_id.
create table public.cv_templates (
  gender text primary key check (gender in ('mujer', 'hombre')),
  design_id text not null,
  title text not null,
  updated_at timestamptz not null default now()
);
alter table public.cv_templates enable row level security;
create policy "cv templates admin" on public.cv_templates for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

insert into public.cv_templates (gender, design_id, title) values
  ('mujer', 'DAHZTeNaomo', 'PLANTILLA · Mujer · Armado automático (no editar)'),
  ('hombre', 'DAHZTdC0aak', 'PLANTILLA · Hombre · Armado automático (no editar)');
