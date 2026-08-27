REVOKE ALL ON FUNCTION public.is_support_or_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_support_or_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_support_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_or_admin(uuid) TO service_role;