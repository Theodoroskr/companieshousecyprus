create or replace function public.truncate_officials_only()
returns void
language plpgsql
security definer
set search_path = public
set statement_timeout = '30s'
as $$
begin
  truncate table public.officials restart identity;
end;
$$;

revoke execute on function public.truncate_officials_only() from public;
revoke execute on function public.truncate_officials_only() from anon;
revoke execute on function public.truncate_officials_only() from authenticated;
grant execute on function public.truncate_officials_only() to service_role;

create or replace function public.reset_officials_counts_chunk(batch_size integer default 5000)
returns integer
language plpgsql
security definer
set search_path = public
set statement_timeout = '30s'
as $$
declare
  affected integer := 0;
begin
  perform set_config('app.skip_indexnow', 'on', true);

  with targets as (
    select slug
    from public.companies
    where officials_count is distinct from 0
    order by slug
    limit greatest(1, least(coalesce(batch_size, 5000), 10000))
    for update skip locked
  )
  update public.companies c
  set officials_count = 0
  from targets t
  where c.slug = t.slug;

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke execute on function public.reset_officials_counts_chunk(integer) from public;
revoke execute on function public.reset_officials_counts_chunk(integer) from anon;
revoke execute on function public.reset_officials_counts_chunk(integer) from authenticated;
grant execute on function public.reset_officials_counts_chunk(integer) to service_role;