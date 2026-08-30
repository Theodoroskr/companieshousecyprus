-- Relay transport for the US Treasury (OFAC) sanctions file.
-- The app's hosting network cannot complete a TLS handshake with the Treasury
-- servers (every request answers HTTP 525), while the database can reach them.
-- These tables + tick function pull the file into the database in bounded
-- ranged pieces so the importer can consume it without touching Treasury.

CREATE TABLE public.sanctions_relay_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  next_offset bigint NOT NULL DEFAULT 0,
  chunk_size integer NOT NULL DEFAULT 8388608,
  total_bytes bigint,
  chunk_count integer NOT NULL DEFAULT 0,
  pending_request_id bigint,
  pending_since timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ready_at timestamptz,
  consumed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_relay_jobs TO service_role;
ALTER TABLE public.sanctions_relay_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and support can view relay jobs"
  ON public.sanctions_relay_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));
GRANT SELECT ON public.sanctions_relay_jobs TO authenticated;

CREATE TABLE public.sanctions_relay_chunks (
  job_id uuid NOT NULL REFERENCES public.sanctions_relay_jobs(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  byte_start bigint NOT NULL,
  byte_length integer NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (job_id, chunk_index)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_relay_chunks TO service_role;
ALTER TABLE public.sanctions_relay_chunks ENABLE ROW LEVEL SECURITY;

CREATE INDEX sanctions_relay_jobs_status_idx ON public.sanctions_relay_jobs (source_code, status, created_at DESC);

-- One step of the relay: collect a finished ranged request, then issue the next.
CREATE OR REPLACE FUNCTION public.sanctions_relay_tick(_source_code text DEFAULT 'OFAC_SDN', _url text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  job public.sanctions_relay_jobs%ROWTYPE;
  resp record;
  raw_len integer;
  kept text;
  kept_len integer;
  cut integer;
  is_final boolean;
  url text := COALESCE(_url, 'https://sanctionslistservice.ofac.treas.gov/api/download/sdn_advanced.xml');
  req_id bigint;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('sanctions_relay_' || _source_code)) THEN
    RETURN jsonb_build_object('status', 'busy');
  END IF;

  SELECT * INTO job FROM public.sanctions_relay_jobs
   WHERE source_code = _source_code AND status IN ('pending', 'fetching')
   ORDER BY created_at DESC LIMIT 1;

  -- Nothing in flight: start a new job only when there is no unconsumed file
  -- waiting and the last completed relay is older than 20 hours.
  IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.sanctions_relay_jobs
                WHERE source_code = _source_code AND status = 'ready') THEN
      RETURN jsonb_build_object('status', 'ready_waiting');
    END IF;
    IF EXISTS (SELECT 1 FROM public.sanctions_relay_jobs
                WHERE source_code = _source_code
                  AND status IN ('consumed', 'ready')
                  AND COALESCE(consumed_at, ready_at) > now() - interval '20 hours') THEN
      RETURN jsonb_build_object('status', 'fresh');
    END IF;
    INSERT INTO public.sanctions_relay_jobs (source_code) VALUES (_source_code) RETURNING * INTO job;
  END IF;

  -- Collect the in-flight response, if it has landed.
  IF job.pending_request_id IS NOT NULL THEN
    SELECT status_code, content, error_msg INTO resp
      FROM net._http_response WHERE id = job.pending_request_id;

    IF NOT FOUND THEN
      IF job.pending_since < now() - interval '10 minutes' THEN
        UPDATE public.sanctions_relay_jobs
           SET pending_request_id = NULL, attempts = attempts + 1, updated_at = now(),
               error = 'Request timed out with no response'
         WHERE id = job.id;
        RETURN jsonb_build_object('status', 'retry', 'offset', job.next_offset);
      END IF;
      RETURN jsonb_build_object('status', 'waiting', 'offset', job.next_offset);
    END IF;

    IF resp.error_msg IS NOT NULL OR resp.status_code NOT IN (200, 206) OR resp.content IS NULL THEN
      DELETE FROM net._http_response WHERE id = job.pending_request_id;
      IF job.attempts >= 5 THEN
        UPDATE public.sanctions_relay_jobs
           SET status = 'failed', pending_request_id = NULL, updated_at = now(),
               error = COALESCE(resp.error_msg, 'HTTP ' || COALESCE(resp.status_code::text, 'null'))
         WHERE id = job.id;
        RETURN jsonb_build_object('status', 'failed');
      END IF;
      UPDATE public.sanctions_relay_jobs
         SET pending_request_id = NULL, attempts = attempts + 1, updated_at = now(),
             error = COALESCE(resp.error_msg, 'HTTP ' || COALESCE(resp.status_code::text, 'null'))
       WHERE id = job.id;
      RETURN jsonb_build_object('status', 'retry', 'offset', job.next_offset);
    END IF;

    raw_len := octet_length(resp.content);
    is_final := raw_len < job.chunk_size;

    IF is_final THEN
      kept := resp.content;
    ELSE
      -- Cut back to the last complete XML tag so no multi-byte character is
      -- split across two pieces; the next range restarts at that byte offset.
      cut := strpos(reverse(resp.content), '>');
      IF cut = 0 THEN
        DELETE FROM net._http_response WHERE id = job.pending_request_id;
        UPDATE public.sanctions_relay_jobs
           SET status = 'failed', pending_request_id = NULL, updated_at = now(),
               error = 'Chunk contained no tag boundary'
         WHERE id = job.id;
        RETURN jsonb_build_object('status', 'failed');
      END IF;
      kept := left(resp.content, length(resp.content) - cut + 1);
    END IF;

    kept_len := octet_length(kept);
    DELETE FROM net._http_response WHERE id = job.pending_request_id;

    INSERT INTO public.sanctions_relay_chunks (job_id, chunk_index, byte_start, byte_length, body)
    VALUES (job.id, job.chunk_count, job.next_offset, kept_len, kept)
    ON CONFLICT (job_id, chunk_index) DO NOTHING;

    UPDATE public.sanctions_relay_jobs
       SET next_offset = next_offset + kept_len,
           chunk_count = chunk_count + 1,
           pending_request_id = NULL,
           pending_since = NULL,
           attempts = 0,
           error = NULL,
           status = CASE WHEN is_final THEN 'ready' ELSE 'fetching' END,
           total_bytes = CASE WHEN is_final THEN next_offset + kept_len ELSE NULL END,
           ready_at = CASE WHEN is_final THEN now() ELSE NULL END,
           updated_at = now()
     WHERE id = job.id
    RETURNING * INTO job;

    IF job.status = 'ready' THEN
      RETURN jsonb_build_object('status', 'ready', 'bytes', job.total_bytes, 'chunks', job.chunk_count);
    END IF;
  END IF;

  -- Issue the next ranged request.
  SELECT net.http_get(
    url := url,
    headers := jsonb_build_object('Range', 'bytes=' || job.next_offset || '-' || (job.next_offset + job.chunk_size - 1)),
    timeout_milliseconds := 120000
  ) INTO req_id;

  UPDATE public.sanctions_relay_jobs
     SET pending_request_id = req_id, pending_since = now(), status = 'fetching', updated_at = now()
   WHERE id = job.id;

  RETURN jsonb_build_object('status', 'requested', 'offset', job.next_offset, 'chunks', job.chunk_count);
END;
$$;

REVOKE ALL ON FUNCTION public.sanctions_relay_tick(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sanctions_relay_tick(text, text) TO service_role, postgres;

-- Housekeeping: drop old relay payloads so the 126 MB text never lingers.
CREATE OR REPLACE FUNCTION public.sanctions_relay_cleanup()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  WITH gone AS (
    DELETE FROM public.sanctions_relay_jobs
     WHERE (status = 'consumed' AND consumed_at < now() - interval '2 hours')
        OR (status = 'failed' AND updated_at < now() - interval '6 hours')
        OR (status IN ('pending','fetching') AND updated_at < now() - interval '6 hours')
        OR (status = 'ready' AND ready_at < now() - interval '2 days')
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM gone;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.sanctions_relay_cleanup() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sanctions_relay_cleanup() TO service_role, postgres;