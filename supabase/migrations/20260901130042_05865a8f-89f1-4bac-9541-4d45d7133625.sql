CREATE OR REPLACE FUNCTION public.companies_row_estimate()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT GREATEST(0, reltuples)::bigint
  FROM pg_class
  WHERE oid = 'public.companies'::regclass
$$;

REVOKE ALL ON FUNCTION public.companies_row_estimate() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.companies_row_estimate() TO service_role;