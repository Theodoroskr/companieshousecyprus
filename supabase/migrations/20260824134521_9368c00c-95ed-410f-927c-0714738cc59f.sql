ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS a4a_reference TEXT,
  ADD COLUMN IF NOT EXISTS a4a_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS a4a_next_attempt_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS order_items_a4a_pending_idx
  ON public.order_items (fulfilment_status, a4a_next_attempt_at);

CREATE TABLE IF NOT EXISTS public.job_state (
  key TEXT PRIMARY KEY,
  locked_until TIMESTAMPTZ,
  paused BOOLEAN NOT NULL DEFAULT false,
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.job_state TO service_role;
ALTER TABLE public.job_state ENABLE ROW LEVEL SECURITY;