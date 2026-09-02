CREATE POLICY "Service role manages sanctions relay chunks"
ON public.sanctions_relay_chunks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);