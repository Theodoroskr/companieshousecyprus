-- 1) Officer data is no longer directly readable by the public API; the
--    GDPR-suppression-aware functions remain the only public path.
DROP POLICY IF EXISTS "Public can read officials" ON public.officials;
REVOKE SELECT ON public.officials FROM anon, authenticated;

-- 2) Staff-role helper moves out of the API-exposed schema so signed-in
--    users cannot invoke the SECURITY DEFINER function directly, while RLS
--    policies keep working.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_support_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() = _user_id
     AND EXISTS (
       SELECT 1 FROM public.user_roles
       WHERE user_id = _user_id AND role IN ('admin', 'support')
     );
$$;

REVOKE ALL ON FUNCTION private.is_support_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_support_or_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Staff can view all order documents" ON public.order_documents;
CREATE POLICY "Staff can view all order documents" ON public.order_documents
  FOR SELECT USING (private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can read all order document files" ON storage.objects;
CREATE POLICY "Staff can read all order document files" ON storage.objects
  FOR SELECT USING (bucket_id = 'order-documents' AND private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can read auth traffic" ON public.auth_traffic_events;
CREATE POLICY "Staff can read auth traffic" ON public.auth_traffic_events
  FOR SELECT USING (private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can view company slug history" ON public.company_slug_history;
CREATE POLICY "Staff can view company slug history" ON public.company_slug_history
  FOR SELECT USING (private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own watches" ON public.company_watches;
CREATE POLICY "Users view own watches" ON public.company_watches
  FOR SELECT USING (auth.uid() = user_id OR private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view alerts for own watches" ON public.company_watch_alerts;
CREATE POLICY "Users view alerts for own watches" ON public.company_watch_alerts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.company_watches w
    WHERE w.id = company_watch_alerts.watch_id
      AND (w.user_id = auth.uid() OR private.is_support_or_admin(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users view own entitlements" ON public.monitoring_entitlements;
CREATE POLICY "Users view own entitlements" ON public.monitoring_entitlements
  FOR SELECT USING (auth.uid() = user_id OR private.is_support_or_admin(auth.uid()));

DROP FUNCTION IF EXISTS public.is_support_or_admin(uuid);