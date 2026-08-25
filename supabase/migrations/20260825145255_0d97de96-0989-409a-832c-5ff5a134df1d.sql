SELECT cron.unschedule('indexnow-submit') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'indexnow-submit'
);

SELECT cron.schedule(
  'indexnow-submit',
  '0 */2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://companieshousecyprus.com/api/public/indexnow',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_0s2MAydLg7nb913k88EOkg_v2-qA9jt"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);