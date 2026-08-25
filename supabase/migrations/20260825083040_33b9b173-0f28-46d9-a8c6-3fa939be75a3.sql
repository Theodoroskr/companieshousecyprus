
drop function if exists public.search_companies_page(text[], text[], text[], int, int, int);
create or replace function public.search_companies_page(
  p_patterns text[],
  p_types text[] default null,
  p_statuses text[] default null,
  p_limit int default 50,
  p_offset int default 0,
  p_cap int default 2000
)
returns table (
  slug text, type_code bpchar, name text, official_no text, reg_number integer,
  status_en text, status_group text, district_en text, locality text,
  total_matches bigint, capped boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with cand as (
    select c.slug, c.type_code, c.name, c.official_no, c.reg_number,
           c.status_en, c.status_group, c.district_en, c.locality
    from public.companies c
    where (p_patterns is null or c.name ilike any (p_patterns))
      and (p_types is null or c.type_code = any (p_types))
      and (p_statuses is null or c.status_group = any (p_statuses))
    limit p_cap
  ), agg as (select count(*)::bigint as n from cand)
  select cand.*, agg.n as total_matches, (agg.n >= p_cap) as capped
  from cand, agg
  order by cand.name asc
  limit p_limit offset p_offset;
$$;
revoke all on function public.search_companies_page(text[], text[], text[], int, int, int) from public, anon, authenticated;
grant execute on function public.search_companies_page(text[], text[], text[], int, int, int) to service_role;
