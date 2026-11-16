-- "Mis finanzas": a move between accounts says where the money went too (e.g. Santander → Ualá, or Ualá → the savings
-- Diego keeps), so "Tu parte en Ualá" counts what came in and what left.
alter table public.personal_moves add column to_account text;
