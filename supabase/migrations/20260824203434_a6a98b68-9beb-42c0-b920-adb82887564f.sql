-- Defence in depth for the private 'order-documents' bucket.
-- Object paths are: <order_id>/<order_item_id>/<filename>
-- Uploads/deletes stay server-side (service role), so no write policies are granted.

DROP POLICY IF EXISTS "Users can read own order document files" ON storage.objects;
CREATE POLICY "Users can read own order document files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-documents'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id::text = (storage.foldername(storage.objects.name))[1]
      AND (o.user_id = auth.uid() OR lower(o.email) = lower(auth.email()))
  )
);

DROP POLICY IF EXISTS "Admins can read all order document files" ON storage.objects;
CREATE POLICY "Admins can read all order document files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- job_state holds internal job secrets: make the admin-only read rule explicit.
DROP POLICY IF EXISTS "Admins can read job state" ON public.job_state;
CREATE POLICY "Admins can read job state"
ON public.job_state
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON public.job_state FROM anon;
GRANT SELECT ON public.job_state TO authenticated;
GRANT ALL ON public.job_state TO service_role;