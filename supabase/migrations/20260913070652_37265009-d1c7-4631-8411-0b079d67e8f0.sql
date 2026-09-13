DROP POLICY IF EXISTS "Staff can view all order documents" ON public.order_documents;
CREATE POLICY "Staff can view all order documents" ON public.order_documents
  FOR SELECT TO authenticated USING (private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can read all order document files" ON storage.objects;
CREATE POLICY "Staff can read all order document files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'order-documents' AND private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can read auth traffic" ON public.auth_traffic_events;
CREATE POLICY "Staff can read auth traffic" ON public.auth_traffic_events
  FOR SELECT TO authenticated USING (private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Staff can view company slug history" ON public.company_slug_history;
CREATE POLICY "Staff can view company slug history" ON public.company_slug_history
  FOR SELECT TO authenticated USING (private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view own watches" ON public.company_watches;
CREATE POLICY "Users view own watches" ON public.company_watches
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view alerts for own watches" ON public.company_watch_alerts;
CREATE POLICY "Users view alerts for own watches" ON public.company_watch_alerts
  FOR SELECT TO authenticated USING (EXISTS (
    SELECT 1 FROM public.company_watches w
    WHERE w.id = company_watch_alerts.watch_id
      AND (w.user_id = auth.uid() OR private.is_support_or_admin(auth.uid()))
  ));

DROP POLICY IF EXISTS "Users view own entitlements" ON public.monitoring_entitlements;
CREATE POLICY "Users view own entitlements" ON public.monitoring_entitlements
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_support_or_admin(auth.uid()));