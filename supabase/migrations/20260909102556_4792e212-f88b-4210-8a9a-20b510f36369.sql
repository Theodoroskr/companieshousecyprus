CREATE OR REPLACE FUNCTION public.is_support_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'support')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_support_or_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_support_or_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_support_or_admin(uuid) TO service_role;