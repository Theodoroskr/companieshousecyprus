REVOKE ALL ON FUNCTION public.enqueue_indexnow_company() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.indexnow_acquire_lease(integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.indexnow_release_lease() FROM anon, authenticated;