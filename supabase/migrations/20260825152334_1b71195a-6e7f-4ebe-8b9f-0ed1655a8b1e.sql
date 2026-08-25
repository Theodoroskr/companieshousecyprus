DO $$
DECLARE tok TEXT;
BEGIN
  SELECT secret INTO tok FROM public.job_state WHERE key = 'sitemap_monitor';

  IF tok IS NULL THEN
    INSERT INTO public.job_state (key, secret)
    VALUES ('sitemap_monitor', encode(gen_random_bytes(24), 'hex'))
    ON CONFLICT (key) DO NOTHING;
    SELECT secret INTO tok FROM public.job_state WHERE key = 'sitemap_monitor';
  END IF;

  PERFORM cron.unschedule('sitemap-health-monitor')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sitemap-health-monitor');

  PERFORM cron.schedule(
    'sitemap-health-monitor',
    '*/15 * * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://companieshousecyprus.com/api/public/sitemap-monitor',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := '{}'::jsonb
      );
    $cmd$, tok)
  );
END $$;