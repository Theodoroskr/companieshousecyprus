-- lovable-cron-fallback-reviewed: 288 runs/day; bounded relay-backed processing needs a secure continuation check and the current relay cannot emit an authenticated event callback
CREATE UNIQUE INDEX IF NOT EXISTS sanctions_staging_import_record_uidx
  ON public.sanctions_staging (import_id, source_record_id);

CREATE OR REPLACE FUNCTION public.sanctions_import_watchdog(_stall_minutes integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stalled_ids uuid[];
  failed_count integer := 0;
  relay_expired integer := 0;
  locks_cleared integer := 0;
BEGIN
  SELECT COALESCE(array_agg(i.id), '{}')
    INTO stalled_ids
    FROM public.sanctions_imports i
    LEFT JOIN public.ofac_import_jobs j ON j.import_id = i.id
   WHERE i.status IN ('started', 'downloading', 'validating', 'parsing', 'staging')
     AND coalesce(j.updated_at, i.started_at) < now() - make_interval(mins => _stall_minutes)
     AND (j.id IS NULL OR j.phase = 'failed');

  IF array_length(stalled_ids, 1) > 0 THEN
    DELETE FROM public.sanctions_staging WHERE import_id = ANY(stalled_ids);

    UPDATE public.sanctions_imports
       SET status = 'failed',
           completed_at = now(),
           error_message = COALESCE(
             error_message,
             'Import stalled in status "' || status || '" for more than ' || _stall_minutes ||
             ' minutes and was closed by the watchdog. No data was published.'
           ),
           diagnostic_details = COALESCE(diagnostic_details, '{}'::jsonb)
             || jsonb_build_object('watchdog', jsonb_build_object('closed_at', now(), 'stalled_status', status))
     WHERE id = ANY(stalled_ids);
    GET DIAGNOSTICS failed_count = ROW_COUNT;
  END IF;

  UPDATE public.sanctions_sources s
     SET import_locked_at = NULL, updated_at = now()
   WHERE s.import_locked_at IS NOT NULL
     AND s.import_locked_at < now() - make_interval(mins => _stall_minutes)
     AND NOT EXISTS (
       SELECT 1 FROM public.ofac_import_jobs j
       JOIN public.sanctions_imports i ON i.id = j.import_id
       WHERE i.source_id = s.id
         AND j.phase IN ('parsing','assembling','publishing')
         AND j.updated_at >= now() - make_interval(mins => _stall_minutes)
     );
  GET DIAGNOSTICS locks_cleared = ROW_COUNT;

  UPDATE public.ofac_import_jobs
     SET lease_until = NULL, attempts = attempts + 1,
         last_error = coalesce(last_error, 'Expired worker lease recovered by watchdog'),
         updated_at = now()
   WHERE phase IN ('parsing','assembling','publishing')
     AND lease_until < now() - interval '2 minutes';

  WITH gone AS (
    DELETE FROM public.sanctions_relay_jobs r
     WHERE r.status = 'ready'
       AND r.ready_at < now() - interval '26 hours'
       AND NOT EXISTS (
         SELECT 1 FROM public.ofac_import_jobs j
         WHERE j.relay_job_id = r.id
           AND j.phase IN ('parsing','assembling','publishing')
       )
    RETURNING 1
  )
  SELECT count(*) INTO relay_expired FROM gone;

  RETURN jsonb_build_object(
    'failed_imports', failed_count,
    'locks_cleared', locks_cleared,
    'relay_jobs_expired', relay_expired
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sanctions_import_watchdog(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sanctions_import_watchdog(integer) TO service_role, postgres;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ofac-sdn-worker';
SELECT cron.schedule(
  'ofac-sdn-worker',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://companieshousecyprus.com/api/public/ofac-worker',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_0s2MAydLg7nb913k88EOkg_v2-qA9jt"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);