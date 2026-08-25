REVOKE ALL ON public.guide_leads FROM anon;
REVOKE INSERT, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.guide_leads FROM authenticated;
GRANT SELECT, UPDATE ON public.guide_leads TO authenticated;
GRANT ALL ON public.guide_leads TO service_role;