CREATE TABLE public.weekly_guides (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), week_start date NOT NULL UNIQUE,
 slug text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'generating' CHECK(status IN ('generating','draft','published','rejected','failed')),
 title text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', content jsonb NOT NULL DEFAULT '{}'::jsonb,
 source_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb, error text, model text NOT NULL DEFAULT 'openai/gpt-6-astra', run_id text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, reviewed_by uuid
);
GRANT SELECT ON public.weekly_guides TO anon;
GRANT SELECT, UPDATE ON public.weekly_guides TO authenticated;
GRANT ALL ON public.weekly_guides TO service_role;
ALTER TABLE public.weekly_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY published_guides_read ON public.weekly_guides FOR SELECT TO anon, authenticated USING(status='published');
CREATE POLICY admin_guides_read ON public.weekly_guides FOR SELECT TO authenticated USING(public.is_admin(auth.uid()));
CREATE POLICY admin_guides_update ON public.weekly_guides FOR UPDATE TO authenticated USING(public.is_admin(auth.uid())) WITH CHECK(public.is_admin(auth.uid()));
CREATE TABLE public.weekly_guide_job (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), paused boolean NOT NULL DEFAULT false, pause_reason text, pause_kind text,
 lease_token uuid, lease_until timestamptz, last_run_at timestamptz, last_error text
);
GRANT SELECT ON public.weekly_guide_job TO authenticated;
GRANT ALL ON public.weekly_guide_job TO service_role;
ALTER TABLE public.weekly_guide_job ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_guide_job_read ON public.weekly_guide_job FOR SELECT TO authenticated USING(public.is_admin(auth.uid()));
CREATE FUNCTION public.claim_weekly_guide_job() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE token uuid := gen_random_uuid();
BEGIN
 INSERT INTO public.weekly_guide_job(id) VALUES(true) ON CONFLICT DO NOTHING;
 UPDATE public.weekly_guide_job SET lease_token=token, lease_until=now()+interval '10 minutes', last_run_at=now()
 WHERE id=true AND paused=false AND (lease_until IS NULL OR lease_until<now());
 IF NOT FOUND THEN RETURN NULL; END IF;
 RETURN token;
END; $$;
REVOKE ALL ON FUNCTION public.claim_weekly_guide_job() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_weekly_guide_job() TO service_role;