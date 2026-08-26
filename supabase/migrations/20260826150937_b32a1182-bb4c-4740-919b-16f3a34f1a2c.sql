SELECT cron.unschedule('eu-sanctions-import') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'eu-sanctions-import'
);

SELECT cron.schedule(
  'eu-sanctions-import',
  '15 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://companieshousecyprus.com/api/public/sanctions-import',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_0s2MAydLg7nb913k88EOkg_v2-qA9jt"}'::jsonb,
    body := '{"source": "cron"}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);