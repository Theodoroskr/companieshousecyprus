CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  access_token text not null unique,
  full_name text not null,
  email text not null,
  firm text,
  vat_number text,
  phone text,
  notes text,
  subtotal_cents integer not null default 0,
  service_fee_cents integer not null default 0,
  vat_cents integer not null default 0,
  total_cents integer not null default 0,
  status text not null default 'awaiting_payment',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

CREATE TABLE public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_slug text not null,
  product_name text not null,
  company_slug text,
  company_name text,
  company_number text,
  quantity integer not null default 1,
  document_price_cents integer not null default 0,
  service_fee_cents integer not null default 0,
  vat_cents integer not null default 0,
  total_cents integer not null default 0,
  a4a_kind text,
  a4a_code text,
  fulfilment_status text not null default 'pending',
  fulfilment_message text,
  report_json jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();