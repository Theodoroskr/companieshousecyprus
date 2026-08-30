-- Listing helpers run only from the server (service role); signed-in users must
-- not be able to call these SECURITY DEFINER functions directly.
REVOKE EXECUTE ON FUNCTION public.companies_by_letter_page(text, integer, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.search_companies_page(text[], text[], text[], integer, integer, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.companies_by_status_page(text[], integer, integer) FROM authenticated;