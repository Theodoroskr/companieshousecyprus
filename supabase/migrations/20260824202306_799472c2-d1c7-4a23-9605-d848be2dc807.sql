CREATE INDEX IF NOT EXISTS companies_updated_at_idx ON public.companies USING btree (updated_at DESC);

CREATE TABLE IF NOT EXISTS public.change_feed_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  changed_count integer NOT NULL DEFAULT 0,
  enqueued_count integer NOT NULL DEFAULT 0,
  chunks_refreshed integer,
  indexnow_submitted integer NOT NULL DEFAULT 0,
  indexnow_status text,
  status text NOT NULL DEFAULT 'running',
  message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS change_feed_runs_started_at_idx ON public.change_feed_runs (started_at DESC);

GRANT SELECT ON public.change_feed_runs TO authenticated;
GRANT ALL ON public.change_feed_runs TO service_role;

ALTER TABLE public.change_feed_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read change feed runs"
  ON public.change_feed_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));