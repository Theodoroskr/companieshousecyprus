-- 1. sources
CREATE TABLE public.sanctions_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_code text NOT NULL UNIQUE,
  source_name text NOT NULL,
  authority text NOT NULL,
  jurisdiction text NOT NULL,
  format_name text NOT NULL,
  format_version text NOT NULL,
  source_url text NOT NULL,
  information_url text,
  expected_content_type text NOT NULL DEFAULT 'application/xml',
  update_frequency text NOT NULL DEFAULT 'every 4 hours',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_sources TO authenticated;
GRANT ALL ON public.sanctions_sources TO service_role;
ALTER TABLE public.sanctions_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions sources" ON public.sanctions_sources FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. imports
CREATE TABLE public.sanctions_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sanctions_sources(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'started',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  source_last_modified timestamptz,
  retrieved_at timestamptz,
  file_name text,
  file_hash_sha256 text,
  file_size_bytes bigint,
  storage_path text,
  record_count integer,
  added_count integer NOT NULL DEFAULT 0,
  modified_count integer NOT NULL DEFAULT 0,
  removed_count integer NOT NULL DEFAULT 0,
  error_message text,
  diagnostic_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sanctions_imports_status_check CHECK (status IN ('started','downloading','validating','parsing','staging','completed','unchanged','failed'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_imports TO authenticated;
GRANT ALL ON public.sanctions_imports TO service_role;
ALTER TABLE public.sanctions_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions imports" ON public.sanctions_imports FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sanctions_imports_source_started_idx ON public.sanctions_imports (source_id, started_at DESC);

-- 3. entries
CREATE TABLE public.sanctions_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.sanctions_sources(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,
  entity_type text NOT NULL DEFAULT 'unknown',
  primary_name text NOT NULL,
  primary_name_normalized text NOT NULL,
  name_original_script text,
  sanctions_programme text,
  legal_basis text,
  listing_reason text,
  designation_date date,
  last_amended_date date,
  active_from timestamptz NOT NULL DEFAULT now(),
  active_to timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  first_seen_import_id uuid REFERENCES public.sanctions_imports(id),
  last_seen_import_id uuid REFERENCES public.sanctions_imports(id),
  record_hash text,
  raw_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sanctions_entries_source_record_key UNIQUE (source_id, source_record_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_entries TO authenticated;
GRANT ALL ON public.sanctions_entries TO service_role;
ALTER TABLE public.sanctions_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions entries" ON public.sanctions_entries FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sanctions_entries_active_idx ON public.sanctions_entries (source_id, is_active);
CREATE INDEX sanctions_entries_name_norm_idx ON public.sanctions_entries (primary_name_normalized);

-- 4. aliases
CREATE TABLE public.sanctions_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanctions_entry_id uuid NOT NULL REFERENCES public.sanctions_entries(id) ON DELETE CASCADE,
  alias_name text NOT NULL,
  alias_name_normalized text NOT NULL,
  alias_type text NOT NULL DEFAULT 'alias',
  name_language text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_aliases TO authenticated;
GRANT ALL ON public.sanctions_aliases TO service_role;
ALTER TABLE public.sanctions_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions aliases" ON public.sanctions_aliases FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sanctions_aliases_entry_idx ON public.sanctions_aliases (sanctions_entry_id);
CREATE INDEX sanctions_aliases_norm_idx ON public.sanctions_aliases (alias_name_normalized);

-- 5. addresses
CREATE TABLE public.sanctions_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanctions_entry_id uuid NOT NULL REFERENCES public.sanctions_entries(id) ON DELETE CASCADE,
  full_address text NOT NULL,
  street text,
  city text,
  region text,
  postcode text,
  country text,
  country_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_addresses TO authenticated;
GRANT ALL ON public.sanctions_addresses TO service_role;
ALTER TABLE public.sanctions_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions addresses" ON public.sanctions_addresses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sanctions_addresses_entry_idx ON public.sanctions_addresses (sanctions_entry_id);

-- 6. identifiers
CREATE TABLE public.sanctions_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanctions_entry_id uuid NOT NULL REFERENCES public.sanctions_entries(id) ON DELETE CASCADE,
  identifier_type text NOT NULL,
  identifier_value text NOT NULL,
  issuing_country text,
  issue_date date,
  expiry_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_identifiers TO authenticated;
GRANT ALL ON public.sanctions_identifiers TO service_role;
ALTER TABLE public.sanctions_identifiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions identifiers" ON public.sanctions_identifiers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sanctions_identifiers_entry_idx ON public.sanctions_identifiers (sanctions_entry_id);
CREATE INDEX sanctions_identifiers_value_idx ON public.sanctions_identifiers (identifier_value);

-- 7. person details
CREATE TABLE public.sanctions_person_details (
  sanctions_entry_id uuid PRIMARY KEY REFERENCES public.sanctions_entries(id) ON DELETE CASCADE,
  date_of_birth jsonb NOT NULL DEFAULT '[]'::jsonb,
  place_of_birth jsonb NOT NULL DEFAULT '[]'::jsonb,
  nationalities jsonb NOT NULL DEFAULT '[]'::jsonb,
  citizenships jsonb NOT NULL DEFAULT '[]'::jsonb,
  gender text,
  titles jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_person_details TO authenticated;
GRANT ALL ON public.sanctions_person_details TO service_role;
ALTER TABLE public.sanctions_person_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions person details" ON public.sanctions_person_details FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. relationships
CREATE TABLE public.sanctions_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanctions_entry_id uuid NOT NULL REFERENCES public.sanctions_entries(id) ON DELETE CASCADE,
  related_source_record_id text,
  related_name text NOT NULL,
  relationship_type text NOT NULL DEFAULT 'related',
  source_description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_relationships TO authenticated;
GRANT ALL ON public.sanctions_relationships TO service_role;
ALTER TABLE public.sanctions_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions relationships" ON public.sanctions_relationships FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sanctions_relationships_entry_idx ON public.sanctions_relationships (sanctions_entry_id);

-- 9. change log
CREATE TABLE public.sanctions_import_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.sanctions_imports(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('added','modified','removed','reactivated')),
  previous_record jsonb,
  new_record jsonb,
  detected_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_import_changes TO authenticated;
GRANT ALL ON public.sanctions_import_changes TO service_role;
ALTER TABLE public.sanctions_import_changes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read sanctions changes" ON public.sanctions_import_changes FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX sanctions_import_changes_import_idx ON public.sanctions_import_changes (import_id, change_type);

-- 10. staging (backend only)
CREATE TABLE public.sanctions_staging (
  id bigserial PRIMARY KEY,
  import_id uuid NOT NULL REFERENCES public.sanctions_imports(id) ON DELETE CASCADE,
  source_record_id text NOT NULL,
  record_hash text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sanctions_staging TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.sanctions_staging_id_seq TO service_role;
ALTER TABLE public.sanctions_staging ENABLE ROW LEVEL SECURITY;
CREATE INDEX sanctions_staging_import_idx ON public.sanctions_staging (import_id);
CREATE UNIQUE INDEX sanctions_staging_unique_idx ON public.sanctions_staging (import_id, source_record_id);

CREATE TRIGGER sanctions_sources_updated_at BEFORE UPDATE ON public.sanctions_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER sanctions_entries_updated_at BEFORE UPDATE ON public.sanctions_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- seed the EU source
INSERT INTO public.sanctions_sources (source_code, source_name, authority, jurisdiction, format_name, format_version, source_url, information_url, expected_content_type, update_frequency)
VALUES (
  'EU_FSF',
  'EU Consolidated Financial Sanctions List',
  'European Commission',
  'European Union',
  'XML',
  '1.1',
  'https://webgate.ec.europa.eu/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content?token=dG9rZW4tMjAxNw',
  'https://data.europa.eu/data/datasets/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions?locale=en',
  'application/xml',
  'every 4 hours'
) ON CONFLICT (source_code) DO NOTHING;

-- concurrency guard: advisory lock keyed on the source code
CREATE OR REPLACE FUNCTION public.sanctions_try_lock(_source_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pg_try_advisory_lock(hashtext('sanctions_import:' || _source_code));
$$;

CREATE OR REPLACE FUNCTION public.sanctions_unlock(_source_code text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT pg_advisory_unlock(hashtext('sanctions_import:' || _source_code));
$$;

REVOKE EXECUTE ON FUNCTION public.sanctions_try_lock(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sanctions_unlock(text) FROM public, anon, authenticated;

-- atomic publication of a staged dataset
CREATE OR REPLACE FUNCTION public.sanctions_publish_import(_import_id uuid)
RETURNS TABLE(added integer, modified integer, removed integer, reactivated integer, active_total integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
SET statement_timeout TO '300s'
AS $$
DECLARE
  v_source uuid;
  v_added integer := 0;
  v_modified integer := 0;
  v_removed integer := 0;
  v_reactivated integer := 0;
  v_active integer := 0;
BEGIN
  SELECT source_id INTO v_source FROM public.sanctions_imports WHERE id = _import_id;
  IF v_source IS NULL THEN RAISE EXCEPTION 'Unknown import %', _import_id; END IF;

  -- log changes first (before mutating live rows)
  INSERT INTO public.sanctions_import_changes (import_id, source_record_id, change_type, previous_record, new_record)
  SELECT _import_id, s.source_record_id,
         CASE WHEN e.id IS NULL THEN 'added'
              WHEN e.is_active = false THEN 'reactivated'
              ELSE 'modified' END,
         e.raw_record, s.payload
  FROM public.sanctions_staging s
  LEFT JOIN public.sanctions_entries e
    ON e.source_id = v_source AND e.source_record_id = s.source_record_id
  WHERE s.import_id = _import_id
    AND (e.id IS NULL OR e.is_active = false OR e.record_hash IS DISTINCT FROM s.record_hash);

  INSERT INTO public.sanctions_import_changes (import_id, source_record_id, change_type, previous_record, new_record)
  SELECT _import_id, e.source_record_id, 'removed', e.raw_record, NULL
  FROM public.sanctions_entries e
  WHERE e.source_id = v_source AND e.is_active
    AND NOT EXISTS (SELECT 1 FROM public.sanctions_staging s WHERE s.import_id = _import_id AND s.source_record_id = e.source_record_id);

  SELECT count(*) FILTER (WHERE change_type = 'added'),
         count(*) FILTER (WHERE change_type = 'modified'),
         count(*) FILTER (WHERE change_type = 'removed'),
         count(*) FILTER (WHERE change_type = 'reactivated')
    INTO v_added, v_modified, v_removed, v_reactivated
  FROM public.sanctions_import_changes WHERE import_id = _import_id;

  -- upsert live entries
  INSERT INTO public.sanctions_entries (
    source_id, source_record_id, entity_type, primary_name, primary_name_normalized,
    name_original_script, sanctions_programme, legal_basis, listing_reason,
    designation_date, last_amended_date, is_active, active_from, active_to,
    first_seen_import_id, last_seen_import_id, record_hash, raw_record)
  SELECT v_source, s.source_record_id,
         coalesce(s.payload->>'entity_type','unknown'),
         coalesce(s.payload->>'primary_name','(unnamed)'),
         coalesce(s.payload->>'primary_name_normalized',''),
         s.payload->>'name_original_script',
         s.payload->>'sanctions_programme',
         s.payload->>'legal_basis',
         s.payload->>'listing_reason',
         nullif(s.payload->>'designation_date','')::date,
         nullif(s.payload->>'last_amended_date','')::date,
         true, now(), NULL,
         _import_id, _import_id, s.record_hash, s.payload
  FROM public.sanctions_staging s
  WHERE s.import_id = _import_id
  ON CONFLICT (source_id, source_record_id) DO UPDATE SET
    entity_type = excluded.entity_type,
    primary_name = excluded.primary_name,
    primary_name_normalized = excluded.primary_name_normalized,
    name_original_script = excluded.name_original_script,
    sanctions_programme = excluded.sanctions_programme,
    legal_basis = excluded.legal_basis,
    listing_reason = excluded.listing_reason,
    designation_date = excluded.designation_date,
    last_amended_date = excluded.last_amended_date,
    is_active = true,
    active_to = NULL,
    active_from = CASE WHEN sanctions_entries.is_active THEN sanctions_entries.active_from ELSE now() END,
    last_seen_import_id = _import_id,
    record_hash = excluded.record_hash,
    raw_record = excluded.raw_record;

  -- replace child rows only for entries present in this import
  DELETE FROM public.sanctions_aliases a USING public.sanctions_entries e, public.sanctions_staging s
   WHERE a.sanctions_entry_id = e.id AND e.source_id = v_source AND e.source_record_id = s.source_record_id AND s.import_id = _import_id;
  DELETE FROM public.sanctions_addresses a USING public.sanctions_entries e, public.sanctions_staging s
   WHERE a.sanctions_entry_id = e.id AND e.source_id = v_source AND e.source_record_id = s.source_record_id AND s.import_id = _import_id;
  DELETE FROM public.sanctions_identifiers i USING public.sanctions_entries e, public.sanctions_staging s
   WHERE i.sanctions_entry_id = e.id AND e.source_id = v_source AND e.source_record_id = s.source_record_id AND s.import_id = _import_id;
  DELETE FROM public.sanctions_relationships r USING public.sanctions_entries e, public.sanctions_staging s
   WHERE r.sanctions_entry_id = e.id AND e.source_id = v_source AND e.source_record_id = s.source_record_id AND s.import_id = _import_id;
  DELETE FROM public.sanctions_person_details p USING public.sanctions_entries e, public.sanctions_staging s
   WHERE p.sanctions_entry_id = e.id AND e.source_id = v_source AND e.source_record_id = s.source_record_id AND s.import_id = _import_id;

  INSERT INTO public.sanctions_aliases (sanctions_entry_id, alias_name, alias_name_normalized, alias_type, name_language, is_primary)
  SELECT e.id, x.alias_name, x.alias_name_normalized, coalesce(x.alias_type,'alias'), x.name_language, coalesce(x.is_primary,false)
  FROM public.sanctions_staging s
  JOIN public.sanctions_entries e ON e.source_id = v_source AND e.source_record_id = s.source_record_id
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(s.payload->'aliases','[]'::jsonb))
    AS x(alias_name text, alias_name_normalized text, alias_type text, name_language text, is_primary boolean)
  WHERE s.import_id = _import_id AND x.alias_name IS NOT NULL;

  INSERT INTO public.sanctions_addresses (sanctions_entry_id, full_address, street, city, region, postcode, country, country_code)
  SELECT e.id, x.full_address, x.street, x.city, x.region, x.postcode, x.country, x.country_code
  FROM public.sanctions_staging s
  JOIN public.sanctions_entries e ON e.source_id = v_source AND e.source_record_id = s.source_record_id
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(s.payload->'addresses','[]'::jsonb))
    AS x(full_address text, street text, city text, region text, postcode text, country text, country_code text)
  WHERE s.import_id = _import_id AND x.full_address IS NOT NULL;

  INSERT INTO public.sanctions_identifiers (sanctions_entry_id, identifier_type, identifier_value, issuing_country, issue_date, expiry_date)
  SELECT e.id, x.identifier_type, x.identifier_value, x.issuing_country, x.issue_date, x.expiry_date
  FROM public.sanctions_staging s
  JOIN public.sanctions_entries e ON e.source_id = v_source AND e.source_record_id = s.source_record_id
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(s.payload->'identifiers','[]'::jsonb))
    AS x(identifier_type text, identifier_value text, issuing_country text, issue_date date, expiry_date date)
  WHERE s.import_id = _import_id AND x.identifier_value IS NOT NULL;

  INSERT INTO public.sanctions_relationships (sanctions_entry_id, related_source_record_id, related_name, relationship_type, source_description)
  SELECT e.id, x.related_source_record_id, x.related_name, coalesce(x.relationship_type,'related'), x.source_description
  FROM public.sanctions_staging s
  JOIN public.sanctions_entries e ON e.source_id = v_source AND e.source_record_id = s.source_record_id
  CROSS JOIN LATERAL jsonb_to_recordset(coalesce(s.payload->'relationships','[]'::jsonb))
    AS x(related_source_record_id text, related_name text, relationship_type text, source_description text)
  WHERE s.import_id = _import_id AND x.related_name IS NOT NULL;

  INSERT INTO public.sanctions_person_details (sanctions_entry_id, date_of_birth, place_of_birth, nationalities, citizenships, gender, titles)
  SELECT e.id,
         coalesce(s.payload->'person'->'date_of_birth','[]'::jsonb),
         coalesce(s.payload->'person'->'place_of_birth','[]'::jsonb),
         coalesce(s.payload->'person'->'nationalities','[]'::jsonb),
         coalesce(s.payload->'person'->'citizenships','[]'::jsonb),
         s.payload->'person'->>'gender',
         coalesce(s.payload->'person'->'titles','[]'::jsonb)
  FROM public.sanctions_staging s
  JOIN public.sanctions_entries e ON e.source_id = v_source AND e.source_record_id = s.source_record_id
  WHERE s.import_id = _import_id AND s.payload ? 'person';

  -- deactivate rows that disappeared from the source (history preserved)
  UPDATE public.sanctions_entries e
     SET is_active = false, active_to = now()
   WHERE e.source_id = v_source AND e.is_active
     AND NOT EXISTS (SELECT 1 FROM public.sanctions_staging s WHERE s.import_id = _import_id AND s.source_record_id = e.source_record_id);

  SELECT count(*)::int INTO v_active FROM public.sanctions_entries WHERE source_id = v_source AND is_active;

  UPDATE public.sanctions_imports
     SET added_count = v_added, modified_count = v_modified, removed_count = v_removed,
         record_count = v_active, status = 'completed', completed_at = now()
   WHERE id = _import_id;

  DELETE FROM public.sanctions_staging WHERE import_id = _import_id;

  RETURN QUERY SELECT v_added, v_modified, v_removed, v_reactivated, v_active;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sanctions_publish_import(uuid) FROM public, anon, authenticated;