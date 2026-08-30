ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS content_updated_at timestamptz;

ALTER TABLE public.companies DISABLE TRIGGER companies_updated_at;
ALTER TABLE public.companies DISABLE TRIGGER companies_indexnow_update;
UPDATE public.companies SET content_updated_at = coalesce(updated_at, now()) WHERE content_updated_at IS NULL;
ALTER TABLE public.companies ENABLE TRIGGER companies_updated_at;
ALTER TABLE public.companies ENABLE TRIGGER companies_indexnow_update;

CREATE INDEX IF NOT EXISTS companies_content_updated_at_idx ON public.companies (content_updated_at DESC);

CREATE OR REPLACE FUNCTION public.set_company_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_updated_at := coalesce(NEW.content_updated_at, now());
    RETURN NEW;
  END IF;

  IF (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.official_no IS DISTINCT FROM NEW.official_no OR
    OLD.type_en IS DISTINCT FROM NEW.type_en OR
    OLD.subtype_en IS DISTINCT FROM NEW.subtype_en OR
    OLD.status_en IS DISTINCT FROM NEW.status_en OR
    OLD.status_group IS DISTINCT FROM NEW.status_group OR
    OLD.status_date IS DISTINCT FROM NEW.status_date OR
    OLD.registration_date IS DISTINCT FROM NEW.registration_date OR
    OLD.address_full IS DISTINCT FROM NEW.address_full OR
    OLD.officials_count IS DISTINCT FROM NEW.officials_count
  ) THEN
    NEW.content_updated_at := now();
  ELSE
    NEW.content_updated_at := coalesce(OLD.content_updated_at, NEW.content_updated_at);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_content_updated_at ON public.companies;
CREATE TRIGGER companies_content_updated_at
BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_company_content_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_sitemap_chunks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chunk_total integer;
  changed text[];
BEGIN
  CREATE TEMP TABLE _sitemap_rows ON COMMIT DROP AS
  SELECT ((row_number() OVER (ORDER BY slug) - 1) / 50000)::int AS chunk_index,
         coalesce(content_updated_at, updated_at) AS lastmod
  FROM public.companies;

  CREATE TEMP TABLE _sitemap_prev ON COMMIT DROP AS
  SELECT chunk_index, url_count, lastmod FROM public.sitemap_chunks;

  DELETE FROM public.sitemap_chunks;

  INSERT INTO public.sitemap_chunks (chunk_index, url_count, lastmod, refreshed_at)
  SELECT chunk_index, count(*)::int, max(lastmod), now()
  FROM _sitemap_rows
  GROUP BY chunk_index;

  SELECT array_agg('/sitemaps/companies/' || c.chunk_index || '.xml')
    INTO changed
  FROM public.sitemap_chunks c
  LEFT JOIN _sitemap_prev p ON p.chunk_index = c.chunk_index
  WHERE p.chunk_index IS NULL
     OR p.url_count IS DISTINCT FROM c.url_count
     OR p.lastmod IS DISTINCT FROM c.lastmod;

  IF changed IS NOT NULL AND array_length(changed, 1) > 0 THEN
    PERFORM public.enqueue_indexnow_urls(changed || ARRAY['/sitemap.xml']);
  END IF;

  SELECT count(*) INTO chunk_total FROM public.sitemap_chunks;
  RETURN chunk_total;
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
    SELECT slug
    FROM public.companies
    WHERE coalesce(content_updated_at, updated_at) >= now() - make_interval(days => greatest(_days, 1))
    ORDER BY coalesce(content_updated_at, updated_at) DESC
    LIMIT greatest(_limit, 1)
  ), ins AS (
    INSERT INTO public.indexnow_queue (slug, path, queued_at, submitted_at, attempts, last_error)
    SELECT slug, '/company/' || slug, now(), NULL, 0, NULL FROM recent
    ON CONFLICT (slug) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO inserted FROM ins;
  RETURN inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.reseed_indexnow_recent_companies(integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_company_content_updated_at() FROM PUBLIC, anon, authenticated;