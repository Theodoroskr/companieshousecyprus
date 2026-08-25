
revoke all on function public.search_companies_page(text[], text[], text[], int, int, int) from public, anon, authenticated;
revoke all on function public.companies_district_counts() from public, anon, authenticated;
grant execute on function public.search_companies_page(text[], text[], text[], int, int, int) to service_role;
grant execute on function public.companies_district_counts() to service_role;
