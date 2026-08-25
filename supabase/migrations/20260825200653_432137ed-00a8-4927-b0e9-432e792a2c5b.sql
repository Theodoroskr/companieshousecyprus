create or replace function public.increment_officials_count_for_slugs(slugs text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if slugs is null or array_length(slugs, 1) is null then
    return;
  end if;

  update public.companies c
  set officials_count = coalesce(c.officials_count, 0) + s.n
  from (
    select slug, count(*)::int as n
    from unnest(slugs) as slug
    group by slug
  ) s
  where c.slug = s.slug;
end;
$$;

revoke execute on function public.increment_officials_count_for_slugs(text[]) from public;
revoke execute on function public.increment_officials_count_for_slugs(text[]) from anon;
revoke execute on function public.increment_officials_count_for_slugs(text[]) from authenticated;
grant execute on function public.increment_officials_count_for_slugs(text[]) to service_role;

create index if not exists companies_officials_count_positive_idx
on public.companies (slug)
where officials_count is distinct from 0;

create or replace function public.clear_officials()
returns void
language plpgsql
security definer
set search_path = public
set statement_timeout = '120s'
as $$
begin
  truncate table public.officials restart identity;

  update public.companies
  set officials_count = 0
  where officials_count is distinct from 0;
end;
$$;

revoke execute on function public.clear_officials() from public;
revoke execute on function public.clear_officials() from anon;
revoke execute on function public.clear_officials() from authenticated;
grant execute on function public.clear_officials() to service_role;