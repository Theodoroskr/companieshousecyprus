-- Enable RLS with explicit public-read / admin-write policies on registry tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT ALL ON public.companies TO service_role;
CREATE POLICY "Public can read companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Admins can insert companies" ON public.companies FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update companies" ON public.companies FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete companies" ON public.companies FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.officials TO anon, authenticated;
GRANT ALL ON public.officials TO service_role;
CREATE POLICY "Public can read officials" ON public.officials FOR SELECT USING (true);
CREATE POLICY "Admins can insert officials" ON public.officials FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update officials" ON public.officials FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete officials" ON public.officials FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Signed-in users must not be able to call this SECURITY DEFINER helper directly;
-- RLS policies that reference it continue to work.
REVOKE EXECUTE ON FUNCTION public.is_support_or_admin(uuid) FROM authenticated, anon, PUBLIC;