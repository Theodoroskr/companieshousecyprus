create schema if not exists private;

create or replace function private.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = 'admin'
  );
$$;

revoke all on function private.is_admin(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin(uuid) to authenticated;
grant execute on function private.is_admin(uuid) to service_role;

drop policy if exists "Admins can upload import files" on storage.objects;
drop policy if exists "Admins can read import files" on storage.objects;
drop policy if exists "Admins can delete import files" on storage.objects;

create policy "Admins can upload import files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'imports' and private.is_admin(auth.uid()));

create policy "Admins can read import files"
on storage.objects
for select
to authenticated
using (bucket_id = 'imports' and private.is_admin(auth.uid()));

create policy "Admins can delete import files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'imports' and private.is_admin(auth.uid()));

revoke execute on function public.is_admin(uuid) from public;
revoke execute on function public.is_admin(uuid) from anon;
revoke execute on function public.is_admin(uuid) from authenticated;