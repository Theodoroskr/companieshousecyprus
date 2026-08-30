CREATE OR REPLACE FUNCTION public.slugify_company_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT nullif(
    btrim(
      regexp_replace(
        lower(regexp_replace(public.unaccent_safe(coalesce(_name, '')), '[^A-Za-z0-9]+', '-', 'g')),
        '(^-+|-+$)', '', 'g'
      ),
      '-'
    ),
    ''
  )
$$;

ALTER TABLE public.companies
  ADD COLUMN canonical_slug text
  GENERATED ALWAYS AS (
    CASE
      WHEN public.slugify_company_name(name) IS NULL
        THEN lower(coalesce(official_no, slug))
      ELSE public.slugify_company_name(name) || '-' || lower(coalesce(official_no, slug))
    END
  ) STORED;

CREATE INDEX IF NOT EXISTS companies_canonical_slug_idx ON public.companies (canonical_slug);

CREATE TABLE public.company_slug_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL REFERENCES public.companies(slug) ON DELETE CASCADE,
  old_canonical_slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX company_slug_history_slug_idx ON public.company_slug_history (slug);

GRANT SELECT ON public.company_slug_history TO authenticated;
GRANT ALL ON public.company_slug_history TO service_role;

ALTER TABLE public.company_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view company slug history"
  ON public.company_slug_history
  FOR SELECT
  TO authenticated
  USING (public.is_support_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.record_company_slug_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.canonical_slug IS NOT NULL
     AND NEW.canonical_slug IS DISTINCT FROM OLD.canonical_slug THEN
    INSERT INTO public.company_slug_history (slug, old_canonical_slug)
    VALUES (NEW.slug, OLD.canonical_slug)
    ON CONFLICT (old_canonical_slug) DO UPDATE
      SET slug = excluded.slug, created_at = now();
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER companies_slug_history
  AFTER UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.record_company_slug_history();

-- IndexNow notifications should point at the canonical, name-based URL.
CREATE OR REPLACE FUNCTION public.enqueue_indexnow_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.skip_indexnow', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND (
    OLD.name IS NOT DISTINCT FROM NEW.name AND
    OLD.official_no IS NOT DISTINCT FROM NEW.official_no AND
    OLD.type_en IS NOT DISTINCT FROM NEW.type_en AND
    OLD.subtype_en IS NOT DISTINCT FROM NEW.subtype_en AND
    OLD.status_en IS NOT DISTINCT FROM NEW.status_en AND
    OLD.status_group IS NOT DISTINCT FROM NEW.status_group AND
    OLD.status_date IS NOT DISTINCT FROM NEW.status_date AND
    OLD.registration_date IS NOT DISTINCT FROM NEW.registration_date AND
    OLD.address_full IS NOT DISTINCT FROM NEW.address_full AND
    OLD.officials_count IS NOT DISTINCT FROM NEW.officials_count
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.indexnow_queue (slug, path, queued_at, submitted_at, attempts, last_error)
  VALUES (NEW.slug, '/company/' || coalesce(NEW.canonical_slug, NEW.slug), now(), NULL, 0, NULL)
  ON CONFLICT (slug) DO UPDATE
    SET path = excluded.path,
        queued_at = now(),
        submitted_at = NULL,
        attempts = 0,
        last_error = NULL;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reseed_indexnow_recent_companies(_days integer DEFAULT 30, _limit integer DEFAULT 5000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted integer;
BEGIN
  WITH recent AS (
    SELECT slug, canonical_slug
    FROM public.companies
    WHERE coalesce(content_updated_at, updated_at) >= now() - make_interval(days => greatest(_days, 1))
    ORDER BY coalesce(content_updated_at, updated_at) DESC
    LIMIT greatest(_limit, 1)
  ), ins AS (
    INSERT INTO public.indexnow_queue (slug, path, queued_at, submitted_at, attempts, last_error)
    SELECT slug, '/company/' || coalesce(canonical_slug, slug), now(), NULL, 0, NULL FROM recent
    ON CONFLICT (slug) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO inserted FROM ins;
  RETURN inserted;
END;
$$;

-- Server-side resolver: maps any historic or canonical name-based slug to the
-- internal registry key.
CREATE OR REPLACE FUNCTION public.resolve_company_slug(_input text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT c.slug FROM public.companies c WHERE c.canonical_slug = lower(btrim(coalesce(_input, ''))) LIMIT 1),
    (SELECT h.slug FROM public.company_slug_history h WHERE h.old_canonical_slug = lower(btrim(coalesce(_input, ''))) LIMIT 1)
  )
$$;

REVOKE ALL ON FUNCTION public.resolve_company_slug(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_company_slug(text) TO service_role;