
create or replace function public.companies_by_letter_page(
  p_letter text,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  slug text, type_code bpchar, name text, official_no text, reg_number integer,
  status_en text, status_group text, district_en text, locality text,
  total_matches bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select c.slug, c.type_code, c.name, c.official_no, c.reg_number,
         c.status_en, c.status_group, c.district_en, c.locality,
         (select count(*)::bigint from public.companies x where upper(left(x.name, 1)) = upper(p_letter))
  from public.companies c
  where upper(left(c.name, 1)) = upper(p_letter)
  order by c.name asc
  limit p_limit offset p_offset;
$$;
revoke all on function public.companies_by_letter_page(text, int, int) from public, anon, authenticated;
grant execute on function public.companies_by_letter_page(text, int, int) to service_role;
