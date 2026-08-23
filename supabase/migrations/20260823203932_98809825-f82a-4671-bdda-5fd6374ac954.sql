CREATE OR REPLACE FUNCTION public.clear_officials()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  TRUNCATE TABLE public.officials RESTART IDENTITY;
END $$;

REVOKE ALL ON FUNCTION public.clear_officials() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clear_officials() TO service_role;