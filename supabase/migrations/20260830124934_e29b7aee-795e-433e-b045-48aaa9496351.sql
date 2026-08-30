REVOKE EXECUTE ON FUNCTION public.is_support_or_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_support_or_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_support_or_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_support_or_admin(uuid) TO service_role;