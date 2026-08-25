create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'admin'
  );
$$;

revoke execute on function public.is_admin(uuid) from public;
revoke execute on function public.is_admin(uuid) from authenticated;
revoke execute on function public.is_admin(uuid) from anon;
grant execute on function public.is_admin(uuid) to postgres;