CREATE INDEX IF NOT EXISTS companies_address_full_name_idx
  ON public.companies (address_full, name);

CREATE INDEX IF NOT EXISTS companies_officials_count_gt0_idx
  ON public.companies (officials_count)
  WHERE officials_count > 0;

CREATE OR REPLACE FUNCTION public.search_companies_page(
  p_patterns text[],
  p_types text[] DEFAULT NULL::text[],
  p_statuses text[] DEFAULT NULL::text[],
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_cap integer DEFAULT 2000
)
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
  ),
  -- Counting is capped: past the cap the exact total is not shown anyway, and
  -- an exact count on a common term scans the whole 571k-row table.
  probe as (
    select 1 from matched limit greatest(coalesce(p_cap, 2000), 1) + 1
  ),
  agg as (select count(*)::bigint as n from probe),
  page as (
    select * from matched order by name asc, slug asc limit p_limit offset p_offset
  )
  select page.*,
         least(agg.n, greatest(coalesce(p_cap, 2000), 1)::bigint) as total_matches,
         agg.n > greatest(coalesce(p_cap, 2000), 1)::bigint as capped
  from page, agg;
$function$;
