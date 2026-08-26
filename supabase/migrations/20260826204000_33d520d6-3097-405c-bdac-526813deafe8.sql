ALTER TABLE public.screening_requests
  ADD COLUMN IF NOT EXISTS scope_version text NOT NULL DEFAULT 'entity-only-v1',
  ADD COLUMN IF NOT EXISTS entity_only boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS excluded_categories jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_file_hashes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS subject_role text NOT NULL DEFAULT 'direct_company',
  ADD COLUMN IF NOT EXISTS parent_request_id uuid REFERENCES public.screening_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS not_screened jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS screening_requests_parent_idx ON public.screening_requests(parent_request_id);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS screening_request_id uuid REFERENCES public.screening_requests(id) ON DELETE SET NULL;