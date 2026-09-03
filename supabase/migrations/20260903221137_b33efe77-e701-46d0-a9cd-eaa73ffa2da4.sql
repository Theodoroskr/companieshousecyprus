CREATE OR REPLACE FUNCTION public.company_name_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH names AS (
  SELECT name FROM public.companies
),
total AS (
  SELECT count(*)::bigint AS n FROM names
),
words AS (
  SELECT lower(w) AS word, count(*)::bigint AS c
  FROM names,
       LATERAL regexp_split_to_table(name, '[^A-Za-z0-9Α-Ωα-ωάέήίόύώΆΈΉΊΌΎΏΪΫϊϋΐΰ]+') AS w
  WHERE length(w) >= 3
    AND upper(w) NOT IN (
      'LTD','LIMITED','ΛΤΔ','ΛΙΜΙΤΕΔ','ΕΠΕ','ΙΚΕ','ΑΕ','ΔΡΑ','ΜΕΠΕ','ΟΕ','ΕΕ',
      'THE','AND','OF','CO','COMPANY','ENTERPRISES','ENTERPRISE','PUBLIC','PLC',
      'HOLDINGS','HOLDING','GROUP','CYPRUS','INTL','INTERNATIONAL'
    )
  GROUP BY 1
  ORDER BY 2 DESC, 1
  LIMIT 200
),
scripts AS (
  SELECT
    count(*) FILTER (WHERE name ~ '[Α-Ωα-ω]' AND name !~ '[A-Za-z]')::bigint AS greek,
    count(*) FILTER (WHERE name !~ '[Α-Ωα-ω]' AND name ~ '[A-Za-z]')::bigint AS latin,
    count(*) FILTER (WHERE name ~ '[Α-Ωα-ω]' AND name ~ '[A-Za-z]')::bigint AS mixed,
    count(*) FILTER (WHERE name !~ '[Α-Ωα-ω]' AND name !~ '[A-Za-z]')::bigint AS other
  FROM names
),
letters AS (
  SELECT upper(left(name, 1)) AS letter, count(*)::bigint AS c
  FROM names
  WHERE upper(left(name, 1)) ~ '^[A-ZΑ-Ω]$'
  GROUP BY 1
),
lengths AS (
  SELECT CASE
           WHEN length(name) <= 10 THEN '1-10'
           WHEN length(name) <= 20 THEN '11-20'
           WHEN length(name) <= 30 THEN '21-30'
           WHEN length(name) <= 40 THEN '31-40'
           ELSE '41+'
         END AS bucket,
         count(*)::bigint AS c
  FROM names
  GROUP BY 1
)
SELECT jsonb_build_object(
  'total', (SELECT n FROM total),
  'top_words', (SELECT jsonb_agg(jsonb_build_object('word', word, 'count', c)) FROM words),
  'scripts', (SELECT jsonb_build_object('greek', greek, 'latin', latin, 'mixed', mixed, 'other', other) FROM scripts),
  'letters', (SELECT jsonb_agg(jsonb_build_object('letter', letter, 'count', c) ORDER BY letter) FROM letters),
  'lengths', (SELECT jsonb_agg(jsonb_build_object('bucket', bucket, 'count', c) ORDER BY bucket) FROM lengths),
  'computed_at', now()
);
$$;

GRANT EXECUTE ON FUNCTION public.company_name_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.company_name_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.company_name_stats() TO service_role;