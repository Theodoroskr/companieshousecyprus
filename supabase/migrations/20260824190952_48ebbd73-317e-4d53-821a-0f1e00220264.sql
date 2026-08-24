CREATE TABLE IF NOT EXISTS public.sitemap_chunks (
  chunk_index integer PRIMARY KEY,
  url_count integer NOT NULL,
  lastmod timestamptz,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sitemap_chunks TO anon;
GRANT SELECT ON public.sitemap_chunks TO authenticated;
GRANT ALL ON public.sitemap_chunks TO service_role;

ALTER TABLE public.sitemap_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sitemap chunk metadata is public" ON public.sitemap_chunks;
CREATE POLICY "Sitemap chunk metadata is public"
  ON public.sitemap_chunks FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.refresh_sitemap_chunks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chunk_total integer;
BEGIN
  CREATE TEMP TABLE _sitemap_rows ON COMMIT DROP AS
  SELECT ((row_number() OVER (ORDER BY slug) - 1) / 50000)::int AS chunk_index,
         updated_at
  FROM public.companies;

  DELETE FROM public.sitemap_chunks;

  INSERT INTO public.sitemap_chunks (chunk_index, url_count, lastmod, refreshed_at)
  SELECT chunk_index, count(*)::int, max(updated_at), now()
  FROM _sitemap_rows
  GROUP BY chunk_index;

  SELECT count(*) INTO chunk_total FROM public.sitemap_chunks;
  RETURN chunk_total;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_sitemap_chunks() FROM public;
GRANT EXECUTE ON FUNCTION public.refresh_sitemap_chunks() TO service_role;

SELECT public.refresh_sitemap_chunks();

SELECT cron.schedule(
  'refresh-sitemap-chunks',
  '17 * * * *',
  $$SELECT public.refresh_sitemap_chunks();$$
);