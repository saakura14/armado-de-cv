create table public.testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- how it is shown, e.g. "Lucía G."
  text text not null,
  service text,                       -- e.g. "Pack Premium"
  rating smallint not null default 5 check (rating between 1 and 5),
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
create policy "testimonials read" on public.testimonials for select to anon, authenticated using (active or (select public.is_admin()));
create policy "testimonials admin write" on public.testimonials for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));