-- Explicit deny-all for non-service roles: these tables are service-role only.
CREATE POLICY "Registry sync job is service-role only"
ON public.registry_sync_job FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Address staging is service-role only"
ON public.registry_address_stage FOR ALL TO authenticated, anon
USING (false) WITH CHECK (false);