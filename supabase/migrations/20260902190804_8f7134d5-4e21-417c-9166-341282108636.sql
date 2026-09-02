CREATE TABLE public.ofac_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL UNIQUE REFERENCES public.sanctions_imports(id) ON DELETE CASCADE,
  relay_job_id uuid NOT NULL UNIQUE REFERENCES public.sanctions_relay_jobs(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'parsing' CHECK (phase IN ('parsing','assembling','publishing','completed','failed')),
  next_chunk integer NOT NULL DEFAULT 0 CHECK (next_chunk >= 0),
  parser_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  hash_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  file_size_bytes bigint NOT NULL DEFAULT 0 CHECK (file_size_bytes >= 0),
  parsed_entries integer NOT NULL DEFAULT 0 CHECK (parsed_entries >= 0),
  staged_entries integer NOT NULL DEFAULT 0 CHECK (staged_entries >= 0),
  person_count integer NOT NULL DEFAULT 0 CHECK (person_count >= 0),
  entity_count integer NOT NULL DEFAULT 0 CHECK (entity_count >= 0),
  ship_count integer NOT NULL DEFAULT 0 CHECK (ship_count >= 0),
  aircraft_count integer NOT NULL DEFAULT 0 CHECK (aircraft_count >= 0),
  wallet_count integer NOT NULL DEFAULT 0 CHECK (wallet_count >= 0),
  force_run boolean NOT NULL DEFAULT false,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofac_import_jobs TO service_role;
ALTER TABLE public.ofac_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OFAC import jobs" ON public.ofac_import_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX ofac_import_jobs_phase_idx ON public.ofac_import_jobs (phase, updated_at);
CREATE INDEX ofac_import_jobs_lease_idx ON public.ofac_import_jobs (lease_until) WHERE phase IN ('parsing','assembling','publishing');

CREATE TABLE public.ofac_reference_values (
  job_id uuid NOT NULL REFERENCES public.ofac_import_jobs(id) ON DELETE CASCADE,
  set_name text NOT NULL,
  ref_id text NOT NULL,
  label text NOT NULL,
  PRIMARY KEY (job_id, set_name, ref_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofac_reference_values TO service_role;
ALTER TABLE public.ofac_reference_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OFAC reference values" ON public.ofac_reference_values FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ofac_locations (
  job_id uuid NOT NULL REFERENCES public.ofac_import_jobs(id) ON DELETE CASCADE,
  location_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (job_id, location_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofac_locations TO service_role;
ALTER TABLE public.ofac_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OFAC locations" ON public.ofac_locations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ofac_id_documents (
  job_id uuid NOT NULL REFERENCES public.ofac_import_jobs(id) ON DELETE CASCADE,
  document_id text NOT NULL,
  identity_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (job_id, document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofac_id_documents TO service_role;
ALTER TABLE public.ofac_id_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OFAC identity documents" ON public.ofac_id_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ofac_id_documents_identity_idx ON public.ofac_id_documents (job_id, identity_id);

CREATE TABLE public.ofac_parties (
  job_id uuid NOT NULL REFERENCES public.ofac_import_jobs(id) ON DELETE CASCADE,
  profile_id text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (job_id, profile_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofac_parties TO service_role;
ALTER TABLE public.ofac_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OFAC parties" ON public.ofac_parties FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE public.ofac_relationships (
  job_id uuid NOT NULL REFERENCES public.ofac_import_jobs(id) ON DELETE CASCADE,
  relationship_id text NOT NULL,
  entry_id text NOT NULL,
  related_profile_id text NOT NULL,
  former boolean NOT NULL DEFAULT false,
  PRIMARY KEY (job_id, relationship_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofac_relationships TO service_role;
ALTER TABLE public.ofac_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OFAC relationships" ON public.ofac_relationships FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ofac_relationships_entry_idx ON public.ofac_relationships (job_id, entry_id);

CREATE TABLE public.ofac_entries (
  job_id uuid NOT NULL REFERENCES public.ofac_import_jobs(id) ON DELETE CASCADE,
  entry_id text NOT NULL,
  profile_id text,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  PRIMARY KEY (job_id, entry_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ofac_entries TO service_role;
ALTER TABLE public.ofac_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages OFAC entries" ON public.ofac_entries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE INDEX ofac_entries_pending_idx ON public.ofac_entries (job_id, entry_id) WHERE processed_at IS NULL;

CREATE OR REPLACE FUNCTION public.ofac_acquire_job_lease(_job_id uuid, _seconds integer DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acquired boolean;
BEGIN
  UPDATE public.ofac_import_jobs
     SET lease_until = now() + make_interval(secs => least(greatest(coalesce(_seconds, 120), 30), 300)),
         updated_at = now()
   WHERE id = _job_id
     AND phase IN ('parsing','assembling','publishing')
     AND (lease_until IS NULL OR lease_until < now())
  RETURNING true INTO acquired;
  RETURN coalesce(acquired, false);
END;
$$;
REVOKE ALL ON FUNCTION public.ofac_acquire_job_lease(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ofac_acquire_job_lease(uuid, integer) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.ofac_release_job_lease(_job_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.ofac_import_jobs SET lease_until = NULL, updated_at = now() WHERE id = _job_id;
$$;
REVOKE ALL ON FUNCTION public.ofac_release_job_lease(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ofac_release_job_lease(uuid) TO service_role, postgres;

CREATE OR REPLACE FUNCTION public.ofac_cleanup_finished_jobs(_retention interval DEFAULT interval '2 hours')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed integer;
BEGIN
  WITH gone AS (
    DELETE FROM public.ofac_import_jobs
     WHERE phase IN ('completed','failed')
       AND coalesce(completed_at, updated_at) < now() - _retention
    RETURNING 1
  )
  SELECT count(*) INTO removed FROM gone;
  RETURN removed;
END;
$$;
REVOKE ALL ON FUNCTION public.ofac_cleanup_finished_jobs(interval) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ofac_cleanup_finished_jobs(interval) TO service_role, postgres;