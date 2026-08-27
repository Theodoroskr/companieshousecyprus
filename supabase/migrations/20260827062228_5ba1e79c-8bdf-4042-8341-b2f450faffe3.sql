ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';

CREATE OR REPLACE FUNCTION public.is_support_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'support')
  );
$$;

DROP POLICY IF EXISTS "Admins can view all order documents" ON public.order_documents;
CREATE POLICY "Staff can view all order documents"
ON public.order_documents
FOR SELECT
TO authenticated
USING (public.is_support_or_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all order document files" ON storage.objects;
CREATE POLICY "Staff can read all order document files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'order-documents' AND public.is_support_or_admin(auth.uid()));