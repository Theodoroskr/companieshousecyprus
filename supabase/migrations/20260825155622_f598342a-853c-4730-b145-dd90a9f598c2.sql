create or replace function public.backfill_officials_count_chunk(start_offset integer, batch_size integer)
returns table(next_offset integer, updated integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
  slug_list text[];
  total integer;
begin
  select array_agg(slug), count(*) into slug_list, total
  from (
    select slug
    from public.officials
    group by slug
    order by slug
    limit batch_size
    offset start_offset
  ) s;

  if slug_list is null or array_length(slug_list, 1) is null then
    return query select start_offset, 0;
    return;
  end if;

  update public.companies c
  set officials_count = o.n
  from (
    select slug, count(*)::int as n
    from public.officials
    where slug = any(slug_list)
    group by slug
  ) o
  where c.slug = o.slug;

  get diagnostics affected = row_count;
  return query select start_offset + total, affected;
end;
$$;

grant execute on function public.backfill_officials_count_chunk(integer, integer) to authenticated;
grant execute on function public.backfill_officials_count_chunk(integer, integer) to service_role;