CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Subjects (cross-source clusters)
CREATE TABLE public.sanctions_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type IN ('individual','entity','vessel','aircraft')),
  canonical_name text NOT NULL,
  canonical_name_normalized text NOT NULL,
  review_status text NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed','automatically_correlated','analyst_confirmed','analyst_rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_subjects TO authenticated;
GRANT ALL ON public.sanctions_subjects TO service_role;
ALTER TABLE public.sanctions_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage subjects" ON public.sanctions_subjects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Subject ↔ official record links
CREATE TABLE public.sanctions_subject_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sanctions_subject_id uuid NOT NULL REFERENCES public.sanctions_subjects(id) ON DELETE CASCADE,
  sanctions_entry_id uuid NOT NULL REFERENCES public.sanctions_entries(id) ON DELETE CASCADE,
  relationship_status text NOT NULL DEFAULT 'possible' CHECK (relationship_status IN ('possible','probable','confirmed','rejected')),
  correlation_method text,
  correlation_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_score numeric,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sanctions_subject_id, sanctions_entry_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sanctions_subject_records TO authenticated;
GRANT ALL ON public.sanctions_subject_records TO service_role;
ALTER TABLE public.sanctions_subject_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage subject records" ON public.sanctions_subject_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Screening requests
CREATE TABLE public.screening_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_reference text NOT NULL UNIQUE,
  requested_by uuid,
  source_context text NOT NULL DEFAULT 'admin_test' CHECK (source_context IN ('admin_test','company_profile','snapshot','monitoring','api')),
  subject_type text NOT NULL CHECK (subject_type IN ('individual','entity','vessel','aircraft')),
  subject_name text NOT NULL,
  normalized_name text NOT NULL,
  jurisdiction text,
  registration_number text,
  lei text,
  date_of_birth date,
  nationality text,
  address text,
  company_id text,
  previous_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  subject_aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources_requested jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_import_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules_version text NOT NULL,
  outcome text CHECK (outcome IN ('confirmed_match_identified','potential_match_identified','no_match_above_threshold','screening_incomplete','source_unavailable')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','partial')),
  error_message text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_requests TO authenticated;
GRANT ALL ON public.screening_requests TO service_role;
ALTER TABLE public.screening_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage screening requests" ON public.screening_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Screening candidates
CREATE TABLE public.screening_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_request_id uuid NOT NULL REFERENCES public.screening_requests(id) ON DELETE CASCADE,
  sanctions_entry_id uuid NOT NULL REFERENCES public.sanctions_entries(id) ON DELETE CASCADE,
  source_code text NOT NULL,
  name_used text NOT NULL,
  matched_name text NOT NULL,
  matched_alias_type text,
  name_similarity numeric,
  identifier_match boolean NOT NULL DEFAULT false,
  jurisdiction_match boolean,
  date_of_birth_match boolean,
  nationality_match boolean,
  address_match boolean,
  entity_type_match boolean,
  corroborating_attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  conflicting_attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
  score_contributions jsonb NOT NULL DEFAULT '{}'::jsonb,
  match_score numeric NOT NULL DEFAULT 0,
  match_level integer,
  system_classification text NOT NULL CHECK (system_classification IN ('strong_candidate','potential_candidate','weak_candidate','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX screening_candidates_request_idx ON public.screening_candidates (screening_request_id, match_score DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_candidates TO authenticated;
GRANT ALL ON public.screening_candidates TO service_role;
ALTER TABLE public.screening_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage screening candidates" ON public.screening_candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Analyst decisions
CREATE TABLE public.screening_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screening_candidate_id uuid NOT NULL REFERENCES public.screening_candidates(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('confirmed_match','potential_match','false_positive','insufficient_information','escalated')),
  decision_source text NOT NULL CHECK (decision_source IN ('system','analyst')),
  rationale text NOT NULL,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX screening_decisions_candidate_idx ON public.screening_decisions (screening_candidate_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_decisions TO authenticated;
GRANT ALL ON public.screening_decisions TO service_role;
ALTER TABLE public.screening_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage screening decisions" ON public.screening_decisions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Audit log
CREATE TABLE public.screening_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  screening_request_id uuid REFERENCES public.screening_requests(id) ON DELETE SET NULL,
  screening_candidate_id uuid,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX screening_audit_request_idx ON public.screening_audit_log (screening_request_id, created_at);
GRANT SELECT, INSERT ON public.screening_audit_log TO authenticated;
GRANT ALL ON public.screening_audit_log TO service_role;
ALTER TABLE public.screening_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.screening_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit log" ON public.screening_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Configurable rules/thresholds
CREATE TABLE public.screening_rules_config (
  key text PRIMARY KEY,
  rules_version text NOT NULL,
  weights jsonb NOT NULL,
  thresholds jsonb NOT NULL,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.screening_rules_config TO authenticated;
GRANT ALL ON public.screening_rules_config TO service_role;
ALTER TABLE public.screening_rules_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage screening config" ON public.screening_rules_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.screening_rules_config (key, rules_version, weights, thresholds) VALUES (
  'default', 'rules-v1',
  '{"name_similarity":40,"alias_primary":10,"alias_strong":6,"alias_weak":2,"identifier_exact":50,"dob":15,"jurisdiction":8,"nationality":8,"address":6,"entity_type":4,"conflict_dob":-25,"conflict_jurisdiction":-15,"conflict_nationality":-12,"conflict_entity_type":-10,"conflict_identifier":-30}'::jsonb,
  '{"strong":85,"potential":60,"weak":40,"min_name_similarity":0.25,"max_candidates":100}'::jsonb
);

-- updated_at trigger for subjects
CREATE TRIGGER sanctions_subjects_updated_at BEFORE UPDATE ON public.sanctions_subjects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Performance indexes for candidate generation
CREATE INDEX IF NOT EXISTS sanctions_entries_name_trgm_idx ON public.sanctions_entries USING gin (primary_name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS sanctions_aliases_name_trgm_idx ON public.sanctions_aliases USING gin (alias_name_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS sanctions_identifiers_lookup_idx ON public.sanctions_identifiers (identifier_type, identifier_value);
CREATE INDEX IF NOT EXISTS sanctions_identifiers_value_norm_idx ON public.sanctions_identifiers ((upper(regexp_replace(identifier_value, '[^A-Za-z0-9]', '', 'g'))));

-- Backend-only candidate generation: name similarity across primary names and aliases
CREATE OR REPLACE FUNCTION public.screening_name_candidates(
  p_names text[],
  p_sources text[] DEFAULT NULL,
  p_entity_types text[] DEFAULT NULL,
  p_min_sim real DEFAULT 0.25,
  p_limit integer DEFAULT 100
)
RETURNS TABLE(
  sanctions_entry_id uuid,
  source_code text,
  entity_type text,
  primary_name text,
  matched_name text,
  matched_alias_type text,
  name_similarity real,
  name_used text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  PERFORM set_config('pg_trgm.similarity_threshold', least(greatest(p_min_sim, 0.05), 0.9), true);
  RETURN QUERY
  WITH input_names AS (
    SELECT DISTINCT trim(n) AS q FROM unnest(p_names) AS n WHERE nullif(trim(n), '') IS NOT NULL
  ),
  entry_hits AS (
    SELECT e.id AS entry_id, s.source_code, e.entity_type, e.primary_name,
           e.primary_name_normalized AS matched_name, 'primary'::text AS matched_alias_type,
           max(similarity(e.primary_name_normalized, n.q)) AS sim,
           (array_agg(n.q ORDER BY similarity(e.primary_name_normalized, n.q) DESC))[1] AS name_used
    FROM input_names n
    JOIN public.sanctions_entries e ON e.primary_name_normalized % n.q AND e.is_active
    JOIN public.sanctions_sources s ON s.id = e.source_id
    WHERE (p_sources IS NULL OR s.source_code = ANY (p_sources))
      AND (p_entity_types IS NULL OR e.entity_type = ANY (p_entity_types))
    GROUP BY e.id, s.source_code, e.entity_type, e.primary_name
  ),
  alias_hits AS (
    SELECT e.id AS entry_id, s.source_code, e.entity_type, e.primary_name,
           a.alias_name_normalized AS matched_name,
           CASE WHEN a.is_primary THEN 'primary' ELSE a.alias_type END AS matched_alias_type,
           max(similarity(a.alias_name_normalized, n.q)) * 0.97 AS sim,
           (array_agg(n.q ORDER BY similarity(a.alias_name_normalized, n.q) DESC))[1] AS name_used
    FROM input_names n
    JOIN public.sanctions_aliases a ON a.alias_name_normalized % n.q
    JOIN public.sanctions_entries e ON e.id = a.sanctions_entry_id AND e.is_active
    JOIN public.sanctions_sources s ON s.id = e.source_id
    WHERE (p_sources IS NULL OR s.source_code = ANY (p_sources))
      AND (p_entity_types IS NULL OR e.entity_type = ANY (p_entity_types))
    GROUP BY e.id, s.source_code, e.entity_type, e.primary_name, a.alias_name_normalized, a.alias_type, a.is_primary
  ),
  combined AS (
    SELECT * FROM entry_hits
    UNION ALL
    SELECT * FROM alias_hits
  ),
  best AS (
    SELECT DISTINCT ON (c.entry_id) c.*
    FROM combined c
    WHERE c.sim >= p_min_sim
    ORDER BY c.entry_id, c.sim DESC
  )
  SELECT b.entry_id, b.source_code, b.entity_type, b.primary_name, b.matched_name,
         b.matched_alias_type, b.sim, b.name_used
  FROM best b
  ORDER BY b.sim DESC
  LIMIT greatest(1, least(p_limit, 500));
END;
$fn$;

-- Backend-only candidate generation: exact reliable-identifier match
CREATE OR REPLACE FUNCTION public.screening_identifier_candidates(
  p_identifiers jsonb,
  p_sources text[] DEFAULT NULL
)
RETURNS TABLE(
  sanctions_entry_id uuid,
  source_code text,
  entity_type text,
  primary_name text,
  identifier_type text,
  identifier_value text,
  issuing_country text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $fn$
  WITH inputs AS (
    SELECT lower(x->>'kind') AS kind,
           upper(regexp_replace(x->>'value', '[^A-Za-z0-9]', '', 'g')) AS norm_value,
           nullif(x->>'country', '') AS country
    FROM jsonb_array_elements(p_identifiers) AS x
    WHERE nullif(x->>'value', '') IS NOT NULL
  ),
  type_map AS (
    SELECT kind, unnest(types) AS identifier_type FROM (VALUES
      ('registration_number', ARRAY['regnumber','registration','registration_number','company registration number']),
      ('lei', ARRAY['lei']),
      ('passport', ARRAY['passport','número de pasaporte','numéro de passeport']),
      ('national_id', ARRAY['id','national_id','national id','fiscalcode','taxid','ssn']),
      ('imo', ARRAY['imo','vessel registration identification'])
    ) AS m(kind, types)
  )
  SELECT DISTINCT e.id, s.source_code, e.entity_type, e.primary_name,
         i.identifier_type, i.identifier_value, i.issuing_country
  FROM inputs inp
  JOIN type_map tm ON tm.kind = inp.kind
  JOIN public.sanctions_identifiers i
    ON lower(i.identifier_type) = tm.identifier_type
   AND upper(regexp_replace(i.identifier_value, '[^A-Za-z0-9]', '', 'g')) = inp.norm_value
  JOIN public.sanctions_entries e ON e.id = i.sanctions_entry_id AND e.is_active
  JOIN public.sanctions_sources s ON s.id = e.source_id
  WHERE (p_sources IS NULL OR s.source_code = ANY (p_sources))
    AND (inp.country IS NULL OR i.issuing_country IS NULL OR upper(i.issuing_country) = upper(inp.country));
$fn$;

GRANT EXECUTE ON FUNCTION public.screening_name_candidates(text[], text[], text[], real, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.screening_identifier_candidates(jsonb, text[]) TO service_role;