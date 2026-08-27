CREATE TABLE public.auth_traffic_events (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL,
  outcome text NOT NULL,
  country text,
  referrer_host text,
  path text,
  user_agent text
);

CREATE INDEX auth_traffic_events_occurred_idx ON public.auth_traffic_events (occurred_at DESC);

GRANT SELECT ON public.auth_traffic_events TO authenticated;
GRANT ALL ON public.auth_traffic_events TO service_role;

ALTER TABLE public.auth_traffic_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read auth traffic"
ON public.auth_traffic_events
FOR SELECT
TO authenticated
USING (public.is_support_or_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.auth_traffic_breakdown(p_since timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH e AS (
    SELECT * FROM public.auth_traffic_events WHERE occurred_at >= p_since
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM e),
    'passed', (SELECT count(*) FROM e WHERE outcome = 'pass'),
    'blocked', (SELECT count(*) FROM e WHERE outcome <> 'pass'),
    'by_country', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t, 'passed', p) ORDER BY t DESC), '[]'::jsonb)
      FROM (
        SELECT coalesce(nullif(country, ''), 'Unknown') AS k, count(*) AS t,
               count(*) FILTER (WHERE outcome = 'pass') AS p
        FROM e GROUP BY 1 ORDER BY 2 DESC LIMIT 15
      ) s
    ),
    'by_referrer', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t, 'passed', p) ORDER BY t DESC), '[]'::jsonb)
      FROM (
        SELECT coalesce(nullif(referrer_host, ''), 'Direct / none') AS k, count(*) AS t,
               count(*) FILTER (WHERE outcome = 'pass') AS p
        FROM e GROUP BY 1 ORDER BY 2 DESC LIMIT 15
      ) s
    ),
    'by_mode', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t, 'passed', p) ORDER BY t DESC), '[]'::jsonb)
      FROM (
        SELECT mode AS k, count(*) AS t, count(*) FILTER (WHERE outcome = 'pass') AS p
        FROM e GROUP BY 1 ORDER BY 2 DESC
      ) s
    ),
    'by_day', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('key', k, 'total', t, 'passed', p) ORDER BY k), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('day', occurred_at), 'YYYY-MM-DD') AS k, count(*) AS t,
               count(*) FILTER (WHERE outcome = 'pass') AS p
        FROM e GROUP BY 1
      ) s
    )
  )
$$;

REVOKE ALL ON FUNCTION public.auth_traffic_breakdown(timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_traffic_breakdown(timestamptz) TO service_role;