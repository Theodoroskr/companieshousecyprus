create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_admin(uuid) to service_role;

create policy "Admins can upload import files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'imports' and public.is_admin(auth.uid()));

create policy "Admins can read import files"
on storage.objects
for select
to authenticated
using (bucket_id = 'imports' and public.is_admin(auth.uid()));

create policy "Admins can delete import files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'imports' and public.is_admin(auth.uid()));

create policy "Service role can manage import files"
on storage.objects
for all
to service_role
using (bucket_id = 'imports')
with check (bucket_id = 'imports');