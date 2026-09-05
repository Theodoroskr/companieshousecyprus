INSERT INTO public.job_state (key, secret)
VALUES ('company_monitoring', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO UPDATE SET secret = COALESCE(public.job_state.secret, encode(gen_random_bytes(24), 'hex'));

DO $$
DECLARE tok TEXT;
BEGIN
  SELECT secret INTO tok FROM public.job_state WHERE key = 'company_monitoring';
  PERFORM cron.unschedule('company-monitoring-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'company-monitoring-daily');
  PERFORM cron.schedule(
    'company-monitoring-daily',
    '30 5 * * *',
    format($cmd$
      SELECT net.http_get(
        url := 'https://project--d72d0752-ae2d-42d6-914e-32d0013f506a.lovable.app/api/public/monitor-check',
        headers := jsonb_build_object('x-job-secret', '%s')
      );
    $cmd$, tok)
  );
END $$;

-- Resolve linter finding: snapshots are service-role only; keep RLS enabled with an explicit deny-all policy.
CREATE POLICY "Snapshots are service-role only"
ON public.company_watch_snapshots
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);
