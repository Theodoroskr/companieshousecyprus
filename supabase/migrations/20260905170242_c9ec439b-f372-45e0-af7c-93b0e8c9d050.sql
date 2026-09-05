GRANT SELECT ON public.monitoring_entitlements TO authenticated;
GRANT ALL ON public.monitoring_entitlements TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.company_watches TO authenticated;
GRANT ALL ON public.company_watches TO service_role;
GRANT SELECT ON public.company_watch_alerts TO authenticated;
GRANT ALL ON public.company_watch_alerts TO service_role;
GRANT ALL ON public.company_watch_snapshots TO service_role;

DROP POLICY IF EXISTS "Users create own watches" ON public.company_watches;
CREATE POLICY "Users create own watches" ON public.company_watches
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);