-- Dedicated scheduled OFAC worker: the 126 MB Advanced XML is handled by the
-- streaming endpoint /api/public/ofac-worker instead of the generic loop.
SELECT cron.schedule(
  'ofac-sdn-worker',
  '40 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://companieshousecyprus.com/api/public/ofac-worker',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_0s2MAydLg7nb913k88EOkg_v2-qA9jt"}'::jsonb,
    body := '{"source": "cron"}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);

-- Enable the OFAC source so the scheduled worker actually runs.
UPDATE public.sanctions_sources SET is_active = true WHERE source_code = 'OFAC_SDN';