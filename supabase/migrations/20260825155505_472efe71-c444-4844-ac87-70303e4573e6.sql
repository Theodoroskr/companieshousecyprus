create or replace function public.update_officials_count_for_slugs(slugs text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.companies c
  set officials_count = o.n
  from (
    select slug, count(*)::int as n
    from public.officials
    where slug = any(slugs)
    group by slug
  ) o
  where c.slug = o.slug;
end;
$$;

grant execute on function public.update_officials_count_for_slugs(text[]) to authenticated;
grant execute on function public.update_officials_count_for_slugs(text[]) to service_role;