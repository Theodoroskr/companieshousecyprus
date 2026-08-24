CREATE TABLE IF NOT EXISTS public.indexnow_queue (
  slug text PRIMARY KEY,
  queued_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);

CREATE INDEX IF NOT EXISTS indexnow_queue_pending_idx
  ON public.indexnow_queue (queued_at)
  WHERE submitted_at IS NULL;

GRANT ALL ON public.indexnow_queue TO service_role;
ALTER TABLE public.indexnow_queue ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.indexnow_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  lease_until timestamptz,
  paused_reason text,
  paused_at timestamptz,
  consecutive_rate_limits integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_submitted_count integer NOT NULL DEFAULT 0,
  last_error text
);

INSERT INTO public.indexnow_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

GRANT ALL ON public.indexnow_state TO service_role;
ALTER TABLE public.indexnow_state ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.enqueue_indexnow_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.skip_indexnow', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.indexnow_queue (slug, queued_at, submitted_at, attempts, last_error)
  VALUES (NEW.slug, now(), NULL, 0, NULL)
  ON CONFLICT (slug) DO UPDATE
    SET queued_at = now(), submitted_at = NULL, attempts = 0, last_error = NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_indexnow_enqueue ON public.companies;
CREATE TRIGGER companies_indexnow_enqueue
  AFTER INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexnow_company();

CREATE OR REPLACE FUNCTION public.indexnow_acquire_lease(_seconds integer DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  UPDATE public.indexnow_state
     SET lease_until = now() + make_interval(secs => _seconds),
         last_run_at = now()
   WHERE id
     AND paused_reason IS NULL
     AND (lease_until IS NULL OR lease_until < now())
  RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.indexnow_release_lease()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.indexnow_state SET lease_until = NULL WHERE id;
$$;

REVOKE ALL ON FUNCTION public.enqueue_indexnow_company() FROM public;
REVOKE ALL ON FUNCTION public.indexnow_acquire_lease(integer) FROM public;
REVOKE ALL ON FUNCTION public.indexnow_release_lease() FROM public;
GRANT EXECUTE ON FUNCTION public.indexnow_acquire_lease(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.indexnow_release_lease() TO service_role;

SELECT cron.unschedule('indexnow-submit') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'indexnow-submit'
);

SELECT cron.schedule(
  'indexnow-submit',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://companieshousecyprus.com/api/public/indexnow',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_0s2MAydLg7nb913k88EOkg_v2-qA9jt"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);