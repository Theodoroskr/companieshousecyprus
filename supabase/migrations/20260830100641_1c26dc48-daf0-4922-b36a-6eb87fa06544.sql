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

TRUNCATE TABLE public.indexnow_queue;

SELECT public.enqueue_indexnow_urls(ARRAY[
  '/',
  '/search',
  '/cyprus-companies-registry',
  '/directory',
  '/guides',
  '/guides/register-company-cyprus',
  '/guides/companies-house-cyprus',
  '/company-set-up/',
  '/pricing',
  '/solutions/kyb-for-banks',
  '/report/structure',
  '/report/credit',
  '/about',
  '/certifications',
  '/resources',
  '/faq',
  '/contact',
  '/sitemap.xml',
  '/sitemaps/pages.xml'
]);

SELECT public.enqueue_indexnow_urls(
  coalesce(
    (SELECT array_agg('/sitemaps/companies/' || chunk_index || '.xml' ORDER BY chunk_index)
       FROM public.sitemap_chunks),
    ARRAY[]::text[]
  )
);

SELECT public.enqueue_indexnow_urls(
  coalesce(
    (SELECT array_agg('/company/' || slug)
       FROM (
         SELECT slug
         FROM public.companies
         WHERE registration_date > (current_date - 30)
            OR status_date > (current_date - 30)
         ORDER BY greatest(coalesce(registration_date, '1900-01-01'::date),
                           coalesce(status_date, '1900-01-01'::date)) DESC
         LIMIT 5000
       ) recent),
    ARRAY[]::text[]
  )
);

UPDATE public.indexnow_state
   SET paused_reason = NULL,
       paused_at = NULL,
       consecutive_rate_limits = 0,
       last_error = NULL
 WHERE id;