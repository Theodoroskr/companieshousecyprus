ALTER TABLE public.job_state ADD COLUMN IF NOT EXISTS secret TEXT;

INSERT INTO public.job_state (key, secret)
VALUES ('a4a_poll', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO UPDATE SET secret = COALESCE(public.job_state.secret, encode(gen_random_bytes(24), 'hex'));

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE tok TEXT;
BEGIN
  SELECT secret INTO tok FROM public.job_state WHERE key = 'a4a_poll';
  PERFORM cron.unschedule('a4a-report-poll') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'a4a-report-poll');
  PERFORM cron.schedule(
    'a4a-report-poll',
    '*/5 * * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://project--d72d0752-ae2d-42d6-914e-32d0013f506a.lovable.app/api/public/a4a-poll',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := '{}'::jsonb
      );
    $cmd$, tok)
  );
END $$;