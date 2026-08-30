-- Guard hooks so a controlled backfill can write content_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF coalesce(current_setting('app.content_backfill', true), 'off') = 'on' THEN
    NEW.updated_at = OLD.updated_at;
    RETURN NEW;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.set_company_content_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.content_updated_at := coalesce(NEW.content_updated_at, now());
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('app.content_backfill', true), 'off') = 'on' THEN
    RETURN NEW;
  END IF;

  IF (
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.official_no IS DISTINCT FROM NEW.official_no OR
    OLD.type_en IS DISTINCT FROM NEW.type_en OR
    OLD.subtype_en IS DISTINCT FROM NEW.subtype_en OR
    OLD.status_en IS DISTINCT FROM NEW.status_en OR
    OLD.status_group IS DISTINCT FROM NEW.status_group OR
    OLD.status_date IS DISTINCT FROM NEW.status_date OR
    OLD.registration_date IS DISTINCT FROM NEW.registration_date OR
    OLD.address_full IS DISTINCT FROM NEW.address_full OR
    OLD.officials_count IS DISTINCT FROM NEW.officials_count
  ) THEN
    NEW.content_updated_at := now();
  ELSE
    NEW.content_updated_at := coalesce(OLD.content_updated_at, NEW.content_updated_at);
  END IF;

  RETURN NEW;
END;
$fn$;

-- Bounded batch: align content_updated_at with the record's own last change.
CREATE OR REPLACE FUNCTION public.backfill_company_content_updated_at(batch_limit integer DEFAULT 2000)
RETURNS TABLE (updated_count integer, remaining_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_updated integer;
  v_limit integer := least(greatest(coalesce(batch_limit, 2000), 1), 5000);
BEGIN
  PERFORM set_config('app.skip_indexnow', 'on', true);
  PERFORM set_config('app.content_backfill', 'on', true);

  WITH target AS (
    SELECT slug, updated_at
    FROM public.companies
    WHERE content_updated_at IS NULL OR content_updated_at < updated_at
    ORDER BY updated_at ASC
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.companies c
  SET content_updated_at = t.updated_at
  FROM target t
  WHERE c.slug = t.slug;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT count(*) INTO remaining_count
  FROM public.companies
  WHERE content_updated_at IS NULL OR content_updated_at < updated_at;

  updated_count := v_updated;
  RETURN NEXT;
END;
$fn$;

REVOKE ALL ON FUNCTION public.backfill_company_content_updated_at(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_company_content_updated_at(integer) TO service_role;

-- Job state row with its own scheduler secret
INSERT INTO public.job_state (key, secret, paused)
VALUES ('content_backfill', encode(gen_random_bytes(24), 'hex'), false)
ON CONFLICT (key) DO UPDATE SET secret = coalesce(public.job_state.secret, excluded.secret);