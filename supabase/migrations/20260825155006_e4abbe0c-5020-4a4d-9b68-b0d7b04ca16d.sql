create or replace function public.refresh_officials_count()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
  batch_affected integer;
  batch_size integer := 5000;
  total integer;
  iterations integer;
begin
  create temp table tmp_officials_counts on commit drop as
  select slug, count(*)::int as n
  from public.officials
  group by slug;

  create index on tmp_officials_counts(slug);

  select count(*) into total from tmp_officials_counts;
  iterations := ceil(total::float / batch_size);

  for i in 0..iterations-1 loop
    update public.companies c
    set officials_count = t.n
    from (
      select slug, n
      from tmp_officials_counts
      order by slug
      limit batch_size offset i * batch_size
    ) t
    where c.slug = t.slug
      and c.officials_count is distinct from t.n;

    get diagnostics batch_affected = row_count;
    affected := affected + batch_affected;
  end loop;

  return affected;
end;
$$;