-- 1. Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Move pg_trgm to extensions schema and rebuild dependent index
DROP INDEX IF EXISTS public.companies_name_gin_trgm_ops;
DROP EXTENSION IF EXISTS pg_trgm CASCADE;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX companies_name_gin_trgm_ops ON public.companies USING gin (name extensions.gin_trgm_ops);

analyze public.companies;
