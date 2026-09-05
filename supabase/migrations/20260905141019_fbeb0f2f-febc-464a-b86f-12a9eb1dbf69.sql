-- lovable-cron-fallback-reviewed: 288 runs/day; each run is a near-zero-cost DB read when idle, and the 5-minute cadence is what makes multi-hundred-MB imports resumable after any interruption.
-- Change-detection state: one row per official open-data CSV file.
CREATE TABLE public.registry_sync_state (
  file_key text PRIMARY KEY,
  url text NOT NULL,
  last_modified text,
  etag text,
  size bigint,
  last_run_id uuid,
  last_checked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.registry_sync_state TO authenticated;
GRANT ALL ON public.registry_sync_state TO service_role;
ALTER TABLE public.registry_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read registry sync state"
ON public.registry_sync_state FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Singleton control row for the automated refresh job.
CREATE TABLE public.registry_sync_job (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  status text NOT NULL DEFAULT 'idle',
  phase text,
  files_changed jsonb NOT NULL DEFAULT '[]'::jsonb,
  run_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.registry_sync_job TO service_role;
ALTER TABLE public.registry_sync_job ENABLE ROW LEVEL SECURITY;
INSERT INTO public.registry_sync_job (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

-- Private staging area: parsed addresses keyed by ADDRESS_SEQ_NO, used when
-- mapping organisations rows during the automated import.
CREATE TABLE public.registry_address_stage (
  seq text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.registry_address_stage TO service_role;
ALTER TABLE public.registry_address_stage ENABLE ROW LEVEL SECURITY;

-- Seed with the stamps of the currently imported files (31 Jul 2026 export),
-- so the first automatic check finds no change rather than re-importing.
INSERT INTO public.registry_sync_state (file_key, url, last_modified, size, last_checked_at) VALUES
  ('organisations', 'https://data.gov.cy/sites/default/files/organisations_97.csv', 'Fri, 31 Jul 2026 08:11:47 GMT', 92693896, now()),
  ('addresses', 'https://data.gov.cy/sites/default/files/registered_office_99.csv', 'Fri, 31 Jul 2026 08:10:50 GMT', 20990591, now()),
  ('officials', 'https://data.gov.cy/sites/default/files/organisation_officials_86.csv', 'Fri, 31 Jul 2026 08:10:07 GMT', 126841123, now())
ON CONFLICT (file_key) DO NOTHING;

-- Shared secret for the cron -> endpoint call (same pattern as other jobs).
INSERT INTO public.job_state (key, secret)
VALUES ('registry_sync', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO UPDATE SET secret = COALESCE(public.job_state.secret, encode(gen_random_bytes(24), 'hex'));

DO $$
DECLARE tok TEXT;
BEGIN
  SELECT secret INTO tok FROM public.job_state WHERE key = 'registry_sync';
  PERFORM cron.unschedule('registry-sync-worker') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'registry-sync-worker');
  PERFORM cron.schedule(
    'registry-sync-worker',
    '*/5 * * * *',
    format($cmd$
      SELECT net.http_get(
        url := 'https://project--d72d0752-ae2d-42d6-914e-32d0013f506a.lovable.app/api/public/registry-sync',
        headers := jsonb_build_object('x-job-secret', '%s')
      );
    $cmd$, tok)
  );
END $$;