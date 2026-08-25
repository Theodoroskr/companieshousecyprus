create or replace function public.refresh_officials_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  with counts as (
    select slug, count(*)::int as n
    from public.officials
    group by slug
  )
  update public.companies c
  set officials_count = counts.n
  from counts
  where c.slug = counts.slug
    and c.officials_count is distinct from counts.n;

  get diagnostics affected = row_count;
  return affected;
end;
$$;