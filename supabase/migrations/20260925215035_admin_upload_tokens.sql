-- Short-lived tokens that let the admin-upload function store an e-book file.
-- No policies: only the service role (the function) can read them.
create table public.admin_upload_tokens (
  token uuid primary key default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '2 hours'
);
alter table public.admin_upload_tokens enable row level security;