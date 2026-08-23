DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all roles" ON public.user_roles;
CREATE POLICY "admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  mode text NOT NULL DEFAULT 'upsert',
  filename text,
  status text NOT NULL DEFAULT 'running',
  rows_processed integer NOT NULL DEFAULT 0,
  rows_failed integer NOT NULL DEFAULT 0,
  message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT ON public.import_runs TO authenticated;
GRANT ALL ON public.import_runs TO service_role;
ALTER TABLE public.import_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read import runs" ON public.import_runs;
CREATE POLICY "admins read import runs" ON public.import_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS import_runs_set_updated_at ON public.import_runs;
CREATE TRIGGER import_runs_set_updated_at BEFORE UPDATE ON public.import_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_officials_count()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE affected integer;
BEGIN
  WITH counts AS (
    SELECT slug, count(*)::int AS n FROM public.officials GROUP BY slug
  )
  UPDATE public.companies c
     SET officials_count = COALESCE(counts.n, 0)
    FROM (SELECT c2.slug, COALESCE(counts.n, 0) AS n
            FROM public.companies c2 LEFT JOIN counts ON counts.slug = c2.slug) AS counts
   WHERE counts.slug = c.slug AND c.officials_count IS DISTINCT FROM counts.n;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END $$;

REVOKE ALL ON FUNCTION public.refresh_officials_count() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_officials_count() TO service_role;

GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.officials TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.officials_id_seq TO service_role;

CREATE INDEX IF NOT EXISTS officials_slug_idx ON public.officials (slug);