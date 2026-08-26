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
  PERFORM set_config('pg_trgm.similarity_threshold', least(greatest(p_min_sim, 0.05), 0.9)::text, true);
  RETURN QUERY
  WITH input_names AS (
    SELECT DISTINCT trim(n) AS q FROM unnest(p_names) AS n WHERE nullif(trim(n), '') IS NOT NULL
  ),
  entry_hits AS (
    SELECT e.id AS entry_id, s.source_code, e.entity_type, e.primary_name,
           e.primary_name_normalized AS matched_name, 'primary'::text AS matched_alias_type,
           max(extensions.similarity(e.primary_name_normalized, n.q))::real AS sim,
           (array_agg(n.q ORDER BY extensions.similarity(e.primary_name_normalized, n.q) DESC))[1] AS name_used
    FROM input_names n
    JOIN public.sanctions_entries e ON e.primary_name_normalized OPERATOR(extensions.%) n.q AND e.is_active
    JOIN public.sanctions_sources s ON s.id = e.source_id
    WHERE (p_sources IS NULL OR s.source_code = ANY (p_sources))
      AND (p_entity_types IS NULL OR e.entity_type = ANY (p_entity_types))
    GROUP BY e.id, s.source_code, e.entity_type, e.primary_name
  ),
  alias_hits AS (
    SELECT e.id AS entry_id, s.source_code, e.entity_type, e.primary_name,
           a.alias_name_normalized AS matched_name,
           CASE WHEN a.is_primary THEN 'primary' ELSE a.alias_type END AS matched_alias_type,
           (max(extensions.similarity(a.alias_name_normalized, n.q)) * 0.97)::real AS sim,
           (array_agg(n.q ORDER BY extensions.similarity(a.alias_name_normalized, n.q) DESC))[1] AS name_used
    FROM input_names n
    JOIN public.sanctions_aliases a ON a.alias_name_normalized OPERATOR(extensions.%) n.q
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