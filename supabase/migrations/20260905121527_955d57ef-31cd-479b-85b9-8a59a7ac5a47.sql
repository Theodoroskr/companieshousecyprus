CREATE TABLE public.company_watches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  company_slug text NOT NULL REFERENCES public.companies(slug) ON DELETE CASCADE,
  company_name text NOT NULL,
  company_number text,
  status text NOT NULL DEFAULT 'active',
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 year'),
  last_checked_at timestamptz,
  last_alert_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX company_watches_active_unique
  ON public.company_watches (lower(email), company_slug)
  WHERE status = 'active';
CREATE INDEX company_watches_user_idx ON public.company_watches (user_id);
CREATE INDEX company_watches_due_idx ON public.company_watches (status, expires_at);
CREATE INDEX company_watches_slug_idx ON public.company_watches (company_slug);

GRANT SELECT, UPDATE ON public.company_watches TO authenticated;
GRANT ALL ON public.company_watches TO service_role;

ALTER TABLE public.company_watches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own watches"
  ON public.company_watches FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_support_or_admin(auth.uid()));

CREATE POLICY "Users cancel own watches"
  ON public.company_watches FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER company_watches_set_updated_at
  BEFORE UPDATE ON public.company_watches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.company_watch_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watch_id uuid NOT NULL REFERENCES public.company_watches(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  field_label text NOT NULL,
  previous_value text,
  new_value text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX company_watch_alerts_watch_idx ON public.company_watch_alerts (watch_id, detected_at DESC);
CREATE INDEX company_watch_alerts_pending_idx ON public.company_watch_alerts (emailed_at) WHERE emailed_at IS NULL;

GRANT SELECT ON public.company_watch_alerts TO authenticated;
GRANT ALL ON public.company_watch_alerts TO service_role;

ALTER TABLE public.company_watch_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view alerts for own watches"
  ON public.company_watch_alerts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_watches w
      WHERE w.id = company_watch_alerts.watch_id
        AND (w.user_id = auth.uid() OR public.is_support_or_admin(auth.uid()))
    )
  );

CREATE TABLE public.company_watch_snapshots (
  company_slug text PRIMARY KEY REFERENCES public.companies(slug) ON DELETE CASCADE,
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.company_watch_snapshots TO service_role;

ALTER TABLE public.company_watch_snapshots ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER company_watch_snapshots_set_updated_at
  BEFORE UPDATE ON public.company_watch_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();