CREATE OR REPLACE FUNCTION public.guard_company_watch_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ent record; used int;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT id, watch_limit, expires_at INTO ent FROM public.monitoring_entitlements
      WHERE id = NEW.entitlement_id AND user_id = auth.uid() AND status = 'active' AND expires_at > now()
      FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'No active monitoring plan'; END IF;
    SELECT count(*) INTO used FROM public.company_watches WHERE entitlement_id = ent.id AND status = 'active';
    IF used >= ent.watch_limit THEN RAISE EXCEPTION 'All monitoring slots are in use'; END IF;
    NEW.status := 'active'; NEW.expires_at := ent.expires_at;
    NEW.order_id := NULL; NEW.order_item_id := NULL;
    NEW.last_checked_at := NULL; NEW.last_alert_at := NULL;
    RETURN NEW;
  END IF;
  -- UPDATE: users may only cancel their watch
  IF NEW.status <> 'cancelled'
     OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.company_slug IS DISTINCT FROM OLD.company_slug OR NEW.entitlement_id IS DISTINCT FROM OLD.entitlement_id
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR NEW.started_at IS DISTINCT FROM OLD.started_at
     OR NEW.order_id IS DISTINCT FROM OLD.order_id OR NEW.order_item_id IS DISTINCT FROM OLD.order_item_id
     OR NEW.company_name IS DISTINCT FROM OLD.company_name OR NEW.company_number IS DISTINCT FROM OLD.company_number
     OR NEW.last_checked_at IS DISTINCT FROM OLD.last_checked_at OR NEW.last_alert_at IS DISTINCT FROM OLD.last_alert_at THEN
    RAISE EXCEPTION 'Only cancelling a watch is allowed';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_company_watch_changes() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_company_watch_changes ON public.company_watches;
CREATE TRIGGER guard_company_watch_changes BEFORE INSERT OR UPDATE ON public.company_watches
FOR EACH ROW EXECUTE FUNCTION public.guard_company_watch_changes();