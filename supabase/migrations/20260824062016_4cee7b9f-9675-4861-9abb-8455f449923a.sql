-- Remove public Data API exposure of registry data; reads go through server functions (service role)
DROP POLICY IF EXISTS "public read companies" ON public.companies;
DROP POLICY IF EXISTS "public read companies authenticated" ON public.companies;
DROP POLICY IF EXISTS "public read officials" ON public.officials;
DROP POLICY IF EXISTS "public read officials authenticated" ON public.officials;

REVOKE ALL ON public.companies FROM anon, authenticated;
REVOKE ALL ON public.officials FROM anon, authenticated;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.officials TO service_role;