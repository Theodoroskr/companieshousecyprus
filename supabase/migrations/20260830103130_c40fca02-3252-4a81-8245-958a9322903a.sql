CREATE OR REPLACE FUNCTION public.unaccent_safe(_t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(translate(
    coalesce(_t, ''),
    'ΆΈΉΊΌΎΏΪΫάέήίόύώϊϋΐΰςáàâäãéèêëíìîïóòôöõúùûüçñ',
    'ΑΕΗΙΟΥΩΙΥαεηιουωιυιυσaaaaaeeeeiiiiooooouuuucn'
  ))
$$;

CREATE OR REPLACE FUNCTION public.normalize_person_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(upper(public.unaccent_safe(coalesce(_name, ''))), '\s+', ' ', 'g'))
$$;

CREATE TABLE public.officials_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  person_name_normalized text NOT NULL,
  company_slug text,
  requester_email text,
  reason text,
  internal_notes text,
  status text NOT NULL DEFAULT 'active',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT officials_suppressions_status_check CHECK (status IN ('active', 'lifted'))
);

CREATE UNIQUE INDEX officials_suppressions_unique_scope
  ON public.officials_suppressions (person_name_normalized, coalesce(company_slug, '*'));

CREATE INDEX officials_suppressions_active_idx
  ON public.officials_suppressions (person_name_normalized)
  WHERE status = 'active';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.officials_suppressions TO authenticated;
GRANT ALL ON public.officials_suppressions TO service_role;

ALTER TABLE public.officials_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage suppressions"
  ON public.officials_suppressions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_officials_suppression_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.person_name := btrim(NEW.person_name);
  NEW.person_name_normalized := public.normalize_person_name(NEW.person_name);
  NEW.company_slug := upper(nullif(btrim(coalesce(NEW.company_slug, '')), ''));
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER officials_suppressions_normalize
  BEFORE INSERT OR UPDATE ON public.officials_suppressions
  FOR EACH ROW EXECUTE FUNCTION public.set_officials_suppression_fields();

CREATE OR REPLACE FUNCTION public.company_officials_public(p_slug text)
RETURNS TABLE(person_name text, position_el text, position_en text, suppressed boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN s.id IS NULL THEN o.person_name ELSE NULL END,
    o.position_el,
    o.position_en,
    (s.id IS NOT NULL)
  FROM public.officials o
  LEFT JOIN LATERAL (
    SELECT x.id FROM public.officials_suppressions x
    WHERE x.status = 'active'
      AND x.person_name_normalized = public.normalize_person_name(o.person_name)
      AND (x.company_slug IS NULL OR x.company_slug = o.slug)
    LIMIT 1
  ) s ON true
  WHERE o.slug = p_slug
  ORDER BY o.position_en NULLS LAST, o.person_name;
$$;

REVOKE ALL ON FUNCTION public.company_officials_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_officials_public(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.company_official_names_public(p_slug text, p_limit integer DEFAULT 20)
RETURNS TABLE(person_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT o.person_name
  FROM public.officials o
  WHERE o.slug = p_slug
    AND NOT EXISTS (
      SELECT 1 FROM public.officials_suppressions s
      WHERE s.status = 'active'
        AND s.person_name_normalized = public.normalize_person_name(o.person_name)
        AND (s.company_slug IS NULL OR s.company_slug = o.slug)
    )
  LIMIT greatest(1, least(coalesce(p_limit, 20), 50));
$$;

REVOKE ALL ON FUNCTION public.company_official_names_public(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_official_names_public(text, integer) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.normalize_person_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unaccent_safe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_person_name(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.unaccent_safe(text) TO service_role;