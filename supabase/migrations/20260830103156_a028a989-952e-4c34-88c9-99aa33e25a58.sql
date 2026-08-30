REVOKE EXECUTE ON FUNCTION public.company_officials_public(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.company_official_names_public(text, integer) FROM anon, authenticated;