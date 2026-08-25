ALTER TABLE public.indexnow_queue ADD COLUMN IF NOT EXISTS path text;
UPDATE public.indexnow_queue SET path = '/company/' || slug WHERE path IS NULL;

CREATE OR REPLACE FUNCTION public.enqueue_indexnow_urls(_paths text[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  IF _paths IS NULL OR array_length(_paths, 1) IS NULL THEN
    RETURN 0;
  END IF;

  INSERT INTO public.indexnow_queue (slug, path, queued_at, submitted_at, attempts, last_error)
  SELECT p, p, now(), NULL, 0, NULL
  FROM unnest(_paths) AS p
  WHERE p LIKE '/%'
  ON CONFLICT (slug) DO UPDATE
    SET path = excluded.path,
        queued_at = now(),
        submitted_at = NULL,
        attempts = 0,
        last_error = NULL;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_indexnow_urls(text[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_indexnow_urls(text[]) TO service_role;

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

  INSERT INTO public.indexnow_queue (slug, path, queued_at, submitted_at, attempts, last_error)
  VALUES (NEW.slug, '/company/' || NEW.slug, now(), NULL, 0, NULL)
  ON CONFLICT (slug) DO UPDATE
    SET path = excluded.path,
        queued_at = now(),
        submitted_at = NULL,
        attempts = 0,
        last_error = NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_indexnow_enqueue ON public.companies;
DROP TRIGGER IF EXISTS companies_indexnow_insert ON public.companies;
DROP TRIGGER IF EXISTS companies_indexnow_update ON public.companies;
CREATE TRIGGER companies_indexnow_insert
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexnow_company();
CREATE TRIGGER companies_indexnow_update
  AFTER UPDATE ON public.companies
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.enqueue_indexnow_company();

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
         updated_at
  FROM public.companies;

  CREATE TEMP TABLE _sitemap_prev ON COMMIT DROP AS
  SELECT chunk_index, url_count, lastmod FROM public.sitemap_chunks;

  DELETE FROM public.sitemap_chunks;

  INSERT INTO public.sitemap_chunks (chunk_index, url_count, lastmod, refreshed_at)
  SELECT chunk_index, count(*)::int, max(updated_at), now()
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

REVOKE ALL ON FUNCTION public.refresh_sitemap_chunks() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sitemap_chunks() TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_indexnow_guide()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.enqueue_indexnow_urls(
    ARRAY['/guides', '/guides/register-company-cyprus', '/sitemaps/pages.xml']
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS guide_editorial_indexnow ON public.guide_editorial;
CREATE TRIGGER guide_editorial_indexnow
  AFTER INSERT OR UPDATE OR DELETE ON public.guide_editorial
  FOR EACH STATEMENT EXECUTE FUNCTION public.enqueue_indexnow_guide();