CREATE OR REPLACE FUNCTION public.registry_filing_days(_window_days integer DEFAULT 45)
RETURNS TABLE (filing_date date, registrations bigint, status_changes bigint)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT max(registration_date) AS d FROM public.companies
  ),
  bounds AS (
    SELECT d AS hi, d - _window_days AS lo FROM latest
  ),
  regs AS (
    SELECT registration_date AS d, count(*) AS n
    FROM public.companies, bounds
    WHERE registration_date BETWEEN bounds.lo AND bounds.hi
    GROUP BY 1
  ),
  stat AS (
    SELECT status_date AS d, count(*) AS n
    FROM public.companies, bounds
    WHERE status_date BETWEEN bounds.lo AND bounds.hi
    GROUP BY 1
  )
  SELECT COALESCE(regs.d, stat.d) AS filing_date,
         COALESCE(regs.n, 0) AS registrations,
         COALESCE(stat.n, 0) AS status_changes
  FROM regs FULL OUTER JOIN stat ON regs.d = stat.d
  ORDER BY 1 DESC;
$$;

REVOKE ALL ON FUNCTION public.registry_filing_days(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registry_filing_days(integer) TO service_role;