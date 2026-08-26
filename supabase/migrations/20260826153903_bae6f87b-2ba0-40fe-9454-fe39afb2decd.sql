ALTER TABLE public.sanctions_sources ADD COLUMN IF NOT EXISTS import_locked_at timestamptz;

CREATE OR REPLACE FUNCTION public.sanctions_try_lock(_source_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH updated AS (
    UPDATE public.sanctions_sources
       SET import_locked_at = now()
     WHERE source_code = _source_code
       AND (import_locked_at IS NULL OR import_locked_at < now() - interval '15 minutes')
     RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$function$;

CREATE OR REPLACE FUNCTION public.sanctions_unlock(_source_code text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH updated AS (
    UPDATE public.sanctions_sources
       SET import_locked_at = NULL
     WHERE source_code = _source_code
     RETURNING id
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$function$;