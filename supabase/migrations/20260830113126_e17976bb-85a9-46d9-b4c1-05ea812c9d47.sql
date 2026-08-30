-- List endpoints must be able to emit the canonical, name-based company URL
-- without recomputing the slug client-side (transliteration of Greek names can
-- diverge from the DB generated column). Return canonical_slug from every
-- listing helper.
DROP FUNCTION IF EXISTS public.companies_by_letter_page(text, integer, integer);
CREATE FUNCTION public.companies_by_letter_page(p_letter text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
RETURNS TABLE(slug text, canonical_slug text, type_code character, name text, official_no text, reg_number integer, status_en text, status_group text, district_en text, locality text, total_matches bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  select c.slug, c.canonical_slug, c.type_code, c.name, c.official_no, c.reg_number,
         c.status_en, c.status_group, c.district_en, c.locality,
         (select count(*)::bigint from public.companies x where upper(left(x.name, 1)) = upper(p_letter))
  from public.companies c
  where upper(left(c.name, 1)) = upper(p_letter)
  order by c.name asc
  limit p_limit offset p_offset;
$function$;

DROP FUNCTION IF EXISTS public.search_companies_page(text[], text[], text[], integer, integer, integer);
CREATE FUNCTION public.search_companies_page(p_patterns text[], p_types text[] DEFAULT NULL::text[], p_statuses text[] DEFAULT NULL::text[], p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_cap integer DEFAULT 2000)
RETURNS TABLE(slug text, canonical_slug text, type_code character, name text, official_no text, reg_number integer, status_en text, status_group text, district_en text, locality text, total_matches bigint, capped boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  with matched as (
    select c.slug, c.canonical_slug, c.type_code, c.name, c.official_no, c.reg_number,
           c.status_en, c.status_group, c.district_en, c.locality
    from public.companies c
    where (p_patterns is null or c.name ilike any (p_patterns))
      and (p_types is null or c.type_code = any (p_types))
      and (p_statuses is null or c.status_group = any (p_statuses))
  ), agg as (select count(*)::bigint as n from matched),
  page as (
    select * from matched order by name asc, slug asc limit p_limit offset p_offset
  )
  select page.*, agg.n as total_matches, false as capped
  from page, agg;
$function$;

DROP FUNCTION IF EXISTS public.companies_by_status_page(text[], integer, integer);
CREATE FUNCTION public.companies_by_status_page(p_statuses text[], p_limit integer, p_offset integer)
RETURNS TABLE(slug text, canonical_slug text, type_code character, name text, official_no text, reg_number integer, status_en text, status_group text, district_en text, locality text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.slug, c.canonical_slug, c.type_code, c.name, c.official_no, c.reg_number,
         c.status_en, c.status_group, c.district_en, c.locality
  FROM public.companies c
  WHERE c.status_en = ANY(p_statuses)
  ORDER BY c.status_en, c.name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$function$;

REVOKE ALL ON FUNCTION public.companies_by_letter_page(text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_companies_page(text[], text[], text[], integer, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.companies_by_status_page(text[], integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.companies_by_letter_page(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_companies_page(text[], text[], text[], integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.companies_by_status_page(text[], integer, integer) TO service_role;