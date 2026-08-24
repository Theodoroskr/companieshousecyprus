CREATE OR REPLACE FUNCTION public.grant_client_role_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_grant_client ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_client
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_client_role_on_signup();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'client'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;