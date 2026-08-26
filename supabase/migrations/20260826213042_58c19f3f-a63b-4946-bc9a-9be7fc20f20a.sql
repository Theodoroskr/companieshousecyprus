ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS charged_subtotal_cents integer,
  ADD COLUMN IF NOT EXISTS charged_tax_cents integer,
  ADD COLUMN IF NOT EXISTS charged_total_cents integer,
  ADD COLUMN IF NOT EXISTS charged_currency text;