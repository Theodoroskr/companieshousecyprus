CREATE TABLE IF NOT EXISTS public.directory_signal_counts (
  signal text PRIMARY KEY,
  company_count bigint NOT NULL DEFAULT 0,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.directory_signal_counts TO anon;
GRANT SELECT ON public.directory_signal_counts TO authenticated;
GRANT ALL ON public.directory_signal_counts TO service_role;

ALTER TABLE public.directory_signal_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Directory counts are public" ON public.directory_signal_counts;
CREATE POLICY "Directory counts are public"
  ON public.directory_signal_counts FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS companies_status_en_name_idx
  ON public.companies USING btree (status_en, name);

CREATE OR REPLACE FUNCTION public.companies_by_status_page(
  p_statuses text[],
  p_limit integer,
  p_offset integer
)
RETURNS TABLE(
  slug text,
  type_code character,
  name text,
  official_no text,
  reg_number integer,
  status_en text,
  status_group text,
  district_en text,
  locality text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.slug, c.type_code, c.name, c.official_no, c.reg_number,
         c.status_en, c.status_group, c.district_en, c.locality
  FROM public.companies c
  WHERE c.status_en = ANY(p_statuses)
  ORDER BY c.status_en, c.name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

CREATE OR REPLACE FUNCTION public.refresh_directory_signal_counts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  WITH counted AS (
    SELECT COALESCE(c.status_en, 'Unknown') AS signal, count(*) AS company_count
    FROM public.companies c
    GROUP BY 1
  )
  INSERT INTO public.directory_signal_counts (signal, company_count, refreshed_at)
  SELECT signal, company_count, now() FROM counted
  ON CONFLICT (signal) DO UPDATE
    SET company_count = EXCLUDED.company_count,
        refreshed_at = EXCLUDED.refreshed_at;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

SELECT public.refresh_directory_signal_counts();

SELECT cron.schedule(
  'refresh-directory-signal-counts',
  '35 * * * *',
  $$SELECT public.refresh_directory_signal_counts();$$
);