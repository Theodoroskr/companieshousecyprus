REVOKE ALL ON FUNCTION public.companies_by_status_page(text[], integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_directory_signal_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.companies_by_status_page(text[], integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_directory_signal_counts() TO service_role;