CREATE OR REPLACE FUNCTION public.refresh_sitemap_chunks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- An explicit predicate is required: the API role runs with the
  -- safe-update guard, which rejects an unqualified DELETE.
  DELETE FROM public.sitemap_chunks WHERE chunk_index IS NOT NULL;

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
$function$;