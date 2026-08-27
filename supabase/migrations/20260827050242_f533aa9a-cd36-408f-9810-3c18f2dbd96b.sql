ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS apostille boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apostille_fee_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS apostille_fee_cents integer NOT NULL DEFAULT 0;