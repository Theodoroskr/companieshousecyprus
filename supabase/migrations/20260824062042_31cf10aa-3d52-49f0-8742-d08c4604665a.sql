-- Stop exposing the SECURITY DEFINER helper to signed-in users; express the
-- admin checks inline instead (RLS on user_roles already limits each user to
-- their own rows, so no recursion is possible).
DROP POLICY IF EXISTS "admins read import runs" ON public.import_runs;
CREATE POLICY "admins read import runs" ON public.import_runs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::app_role
  ));

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated, anon, PUBLIC;