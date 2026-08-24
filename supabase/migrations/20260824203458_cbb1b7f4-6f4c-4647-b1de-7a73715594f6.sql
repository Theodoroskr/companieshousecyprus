DROP POLICY IF EXISTS "Admins can read indexnow queue" ON public.indexnow_queue;
CREATE POLICY "Admins can read indexnow queue"
ON public.indexnow_queue
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can read indexnow state" ON public.indexnow_state;
CREATE POLICY "Admins can read indexnow state"
ON public.indexnow_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.indexnow_queue FROM anon;
REVOKE ALL ON public.indexnow_state FROM anon;
GRANT SELECT ON public.indexnow_queue TO authenticated;
GRANT SELECT ON public.indexnow_state TO authenticated;
GRANT ALL ON public.indexnow_queue TO service_role;
GRANT ALL ON public.indexnow_state TO service_role;