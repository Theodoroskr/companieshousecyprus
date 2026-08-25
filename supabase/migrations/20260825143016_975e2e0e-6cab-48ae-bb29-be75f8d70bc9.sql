CREATE TABLE IF NOT EXISTS public.sitemap_health_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  healthy BOOLEAN NOT NULL,
  checked_count INTEGER NOT NULL DEFAULT 0,
  failing_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  failures JSONB NOT NULL DEFAULT '[]'::jsonb,
  alert_signature TEXT,
  alerted BOOLEAN NOT NULL DEFAULT false,
  alert_kind TEXT,
  alert_error TEXT
);

CREATE INDEX IF NOT EXISTS sitemap_health_runs_checked_at_idx
  ON public.sitemap_health_runs (checked_at DESC);

GRANT SELECT ON public.sitemap_health_runs TO authenticated;
GRANT ALL ON public.sitemap_health_runs TO service_role;

ALTER TABLE public.sitemap_health_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read sitemap health runs" ON public.sitemap_health_runs;
CREATE POLICY "Admins can read sitemap health runs"
ON public.sitemap_health_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.job_state (key, secret)
VALUES ('sitemap_monitor', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO UPDATE SET secret = COALESCE(public.job_state.secret, encode(gen_random_bytes(24), 'hex'));

DO $$
DECLARE tok TEXT;
BEGIN
  SELECT secret INTO tok FROM public.job_state WHERE key = 'sitemap_monitor';
  PERFORM cron.unschedule('sitemap-health-monitor') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sitemap-health-monitor');
  PERFORM cron.schedule(
    'sitemap-health-monitor',
    '*/15 * * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://project--d72d0752-ae2d-42d6-914e-32d0013f506a.lovable.app/api/public/sitemap-monitor',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := '{}'::jsonb
      );
    $cmd$, tok)
  );
END $$;