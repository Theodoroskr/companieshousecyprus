CREATE TABLE public.monitoring_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  watch_limit integer NOT NULL DEFAULT 5,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 year'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX monitoring_entitlements_user_idx ON public.monitoring_entitlements (user_id, status, expires_at);

GRANT SELECT ON public.monitoring_entitlements TO authenticated;
GRANT ALL ON public.monitoring_entitlements TO service_role;

ALTER TABLE public.monitoring_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own entitlements"
  ON public.monitoring_entitlements FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_support_or_admin(auth.uid()));

CREATE TRIGGER monitoring_entitlements_set_updated_at
  BEFORE UPDATE ON public.monitoring_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.company_watches
  ADD COLUMN entitlement_id uuid REFERENCES public.monitoring_entitlements(id) ON DELETE CASCADE;

CREATE INDEX company_watches_entitlement_idx ON public.company_watches (entitlement_id);