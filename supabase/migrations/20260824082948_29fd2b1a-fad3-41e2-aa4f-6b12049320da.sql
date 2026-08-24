GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.officials TO service_role;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.officials DISABLE ROW LEVEL SECURITY;