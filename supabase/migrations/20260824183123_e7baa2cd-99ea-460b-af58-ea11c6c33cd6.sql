ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

INSERT INTO public.job_state (key, secret)
VALUES ('order_reminders', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO UPDATE SET secret = COALESCE(public.job_state.secret, encode(gen_random_bytes(24), 'hex'));

DO $$
DECLARE tok TEXT;
BEGIN
  SELECT secret INTO tok FROM public.job_state WHERE key = 'order_reminders';
  PERFORM cron.unschedule('order-payment-reminders') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'order-payment-reminders');
  PERFORM cron.schedule(
    'order-payment-reminders',
    '*/5 * * * *',
    format($cmd$
      SELECT net.http_post(
        url := 'https://project--d72d0752-ae2d-42d6-914e-32d0013f506a.lovable.app/api/public/order-reminders',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
        body := '{}'::jsonb
      );
    $cmd$, tok)
  );
END $$;