-- Watchdog for stalled sanctions imports.
-- Scheduled OFAC runs have been dying mid-parse without ever writing an error,
-- leaving the import row in 'parsing', partial staging rows behind, and a
-- two-day-old relayed copy of the file marked 'ready' but never consumed
-- (which blocks the relay from fetching a fresh copy).

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
  SELECT COALESCE(array_agg(id), '{}')
    INTO stalled_ids
    FROM public.sanctions_imports
   WHERE status IN ('started', 'downloading', 'validating', 'parsing', 'staging')
     AND started_at < now() - make_interval(mins => _stall_minutes);

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

  -- Release import locks that outlived a stalled run.
  UPDATE public.sanctions_sources
     SET import_locked_at = NULL, updated_at = now()
   WHERE import_locked_at IS NOT NULL
     AND import_locked_at < now() - make_interval(mins => _stall_minutes);
  GET DIAGNOSTICS locks_cleared = ROW_COUNT;

  -- A relayed file that nobody consumed within 26 hours is stale: drop it so
  -- sanctions_relay_tick() starts a fresh transfer instead of waiting forever.
  WITH gone AS (
    DELETE FROM public.sanctions_relay_jobs
     WHERE status = 'ready'
       AND ready_at < now() - interval '26 hours'
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

SELECT cron.schedule(
  'sanctions-import-watchdog',
  '*/10 * * * *',
  $$SELECT public.sanctions_import_watchdog();$$
);

-- Clear the current jam immediately.
SELECT public.sanctions_import_watchdog(30);

-- The stale relayed copy is from 30 Aug; force it out now so the next relay
-- tick starts a fresh transfer of today's file.
DELETE FROM public.sanctions_relay_jobs
 WHERE source_code = 'OFAC_SDN' AND status = 'ready' AND ready_at < now() - interval '6 hours';