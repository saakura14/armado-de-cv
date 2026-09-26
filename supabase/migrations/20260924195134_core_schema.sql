-- ============ Profiles & roles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'client' check (role in ('client','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when lower(new.email) in ('ayuda.armadodecv@gmail.com','valeeria.gil@gmail.com') then 'admin' else 'client' end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clients may edit their name/phone/avatar but never their role.
create or replace function public.protect_profile_role() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'No podés cambiar tu rol';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ============ Catalog ============
create table public.products (
  id text primary key,
  category text not null check (category in ('cv','asesorias','vocacional','curso','sesion')),
  name text not null,
  subtitle text,
  price integer not null check (price >= 0),
  -- how the purchase is fulfilled after payment
  delivery text not null check (delivery in ('service','digital','session','course')),
  session_minutes integer,           -- when the product includes a 1:1 Meet
  choice_label text,                 -- customer picks exactly one e-book
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.extra_groups (
  id text primary key,
  label text not null,
  unit_price integer not null check (unit_price >= 0),
  hint text
);

create table public.extra_options (
  group_id text not null references public.extra_groups(id) on delete cascade,
  id text not null,
  label text not null,
  is_other boolean not null default false,  -- asks the customer to type what they need
  session_minutes integer,                  -- option that adds a 1:1 Meet
  sort integer not null default 0,
  primary key (group_id, id)
);

create table public.product_extra_groups (
  product_id text not null references public.products(id) on delete cascade,
  group_id text not null references public.extra_groups(id) on delete cascade,
  sort integer not null default 0,
  primary key (product_id, group_id)
);

create table public.ebooks (
  id text primary key,
  title text not null,
  description text,
  file_path text,   -- object path inside the private "ebooks" bucket
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- E-books a product always grants (packs). Products with choice_label grant the chosen one instead.
create table public.product_ebooks (
  product_id text not null references public.products(id) on delete cascade,
  ebook_id text not null references public.ebooks(id) on delete cascade,
  primary key (product_id, ebook_id)
);

-- E-books offered as the choice of a product.
create table public.product_ebook_choices (
  product_id text not null references public.products(id) on delete cascade,
  ebook_id text not null references public.ebooks(id) on delete cascade,
  sort integer not null default 0,
  primary key (product_id, ebook_id)
);

-- ============ Pre-recorded courses ============
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  product_id text unique references public.products(id) on delete set null,
  slug text unique not null,
  title text not null,
  description text,
  cover_url text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text,
  video_url text,          -- unlisted YouTube/Vimeo link or storage path
  attachment_path text,    -- optional file inside the "course-files" bucket
  duration_minutes integer,
  is_preview boolean not null default false,
  created_at timestamptz not null default now()
);
create index lessons_course_idx on public.lessons(course_id, position);

-- ============ Orders ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','payment_review','paid','in_progress','delivered','cancelled')),
  total integer not null check (total >= 0),
  customer_name text,
  customer_phone text,
  customer_note text,
  receipt_path text,
  receipt_uploaded_at timestamptz,
  admin_note text,
  paid_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index orders_status_idx on public.orders(status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  product_name text not null,
  unit_price integer not null,
  chosen_ebook_id text references public.ebooks(id),
  extras jsonb not null default '[]'::jsonb,   -- [{group_id, option_id, label, detail, price}]
  line_total integer not null
);
create index order_items_order_idx on public.order_items(order_id);

-- ============ Entitlements ============
create table public.ebook_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id text not null references public.ebooks(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, ebook_id)
);

create table public.course_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ============ 1:1 sessions (Google Meet) ============
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  duration_minutes integer not null default 60,
  status text not null default 'to_schedule' check (status in ('to_schedule','scheduled','done','cancelled')),
  scheduled_at timestamptz,
  meet_url text check (meet_url is null or meet_url like 'https://%'),
  admin_note text,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on public.sessions(user_id);
create index sessions_order_idx on public.sessions(order_id);
create index order_items_product_idx on public.order_items(product_id);
create index order_items_ebook_idx on public.order_items(chosen_ebook_id);
create index ebook_access_ebook_idx on public.ebook_access(ebook_id);
create index ebook_access_order_idx on public.ebook_access(order_id);
create index course_access_course_idx on public.course_access(course_id);
create index course_access_order_idx on public.course_access(order_id);
create index product_extra_groups_group_idx on public.product_extra_groups(group_id);
create index product_ebooks_ebook_idx on public.product_ebooks(ebook_id);
create index product_ebook_choices_ebook_idx on public.product_ebook_choices(ebook_id);

-- ============ RLS ============
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.extra_groups enable row level security;
alter table public.extra_options enable row level security;
alter table public.product_extra_groups enable row level security;
alter table public.ebooks enable row level security;
alter table public.product_ebooks enable row level security;
alter table public.product_ebook_choices enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.ebook_access enable row level security;
alter table public.course_access enable row level security;
alter table public.sessions enable row level security;

create policy "profiles: own or admin read" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: own or admin update" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- Public catalog
create policy "catalog read" on public.products for select to anon, authenticated using (active or (select public.is_admin()));
create policy "catalog read" on public.extra_groups for select to anon, authenticated using (true);
create policy "catalog read" on public.extra_options for select to anon, authenticated using (true);
create policy "catalog read" on public.product_extra_groups for select to anon, authenticated using (true);
create policy "catalog read" on public.ebooks for select to anon, authenticated using (active or (select public.is_admin()));
create policy "catalog read" on public.product_ebooks for select to anon, authenticated using (true);
create policy "catalog read" on public.product_ebook_choices for select to anon, authenticated using (true);
create policy "courses read" on public.courses for select to anon, authenticated using (published or (select public.is_admin()));
-- Lessons: previews are public; the rest only for buyers.
create policy "lessons read" on public.lessons for select to anon, authenticated using (
  is_preview
  or (select public.is_admin())
  or exists (select 1 from public.course_access ca where ca.course_id = lessons.course_id and ca.user_id = (select auth.uid()))
);

-- Admin manages the catalog
create policy "admin write" on public.products for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.extra_groups for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.extra_options for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.product_extra_groups for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.ebooks for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.product_ebooks for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.product_ebook_choices for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.courses for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admin write" on public.lessons for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Orders: read own (admin all). All writes go through RPCs.
create policy "orders read" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "order items read" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and (o.user_id = (select auth.uid()) or (select public.is_admin()))));
create policy "ebook access read" on public.ebook_access for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "course access read" on public.course_access for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "sessions read" on public.sessions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
