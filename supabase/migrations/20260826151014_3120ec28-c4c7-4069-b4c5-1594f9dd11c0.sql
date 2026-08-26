CREATE POLICY "Admins can read sanctions staging"
ON public.sanctions_staging
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));