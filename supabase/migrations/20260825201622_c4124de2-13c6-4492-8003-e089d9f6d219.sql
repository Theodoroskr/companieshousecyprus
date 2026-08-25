delete from public.officials o
using public.officials keep
where o.slug = keep.slug
  and o.person_name = keep.person_name
  and coalesce(o.position_el, '') = coalesce(keep.position_el, '')
  and coalesce(o.position_en, '') = coalesce(keep.position_en, '')
  and o.id > keep.id;

create unique index if not exists officials_unique_import_row_idx
on public.officials (slug, person_name, coalesce(position_el, ''), coalesce(position_en, ''));

create or replace function public.insert_officials_import_batch(rows jsonb)
returns table(inserted integer, skipped integer)
language plpgsql
security definer
set search_path = public
set statement_timeout = '60s'
as $$
declare
  total_rows integer := 0;
  inserted_rows integer := 0;
begin
  if rows is null or jsonb_typeof(rows) <> 'array' then
    return query select 0, 0;
    return;
  end if;

  create temporary table tmp_officials_import_batch (
    slug text not null,
    person_name text not null,
    position_el text,
    position_en text
  ) on commit drop;

  insert into tmp_officials_import_batch (slug, person_name, position_el, position_en)
  select trim(x.slug), trim(x.person_name), nullif(trim(x.position_el), ''), nullif(trim(x.position_en), '')
  from jsonb_to_recordset(rows) as x(slug text, person_name text, position_el text, position_en text)
  where nullif(trim(x.slug), '') is not null
    and nullif(trim(x.person_name), '') is not null;

  get diagnostics total_rows = row_count;

  with inserted_set as (
    insert into public.officials (slug, person_name, position_el, position_en)
    select t.slug, t.person_name, t.position_el, t.position_en
    from tmp_officials_import_batch t
    join public.companies c on c.slug = t.slug
    where not exists (
      select 1
      from public.officials existing
      where existing.slug = t.slug
        and existing.person_name = t.person_name
        and coalesce(existing.position_el, '') = coalesce(t.position_el, '')
        and coalesce(existing.position_en, '') = coalesce(t.position_en, '')
    )
    on conflict do nothing
    returning slug
  ), counts as (
    select slug, count(*)::int as n
    from inserted_set
    group by slug
  ), updated_counts as (
    update public.companies c
    set officials_count = coalesce(c.officials_count, 0) + counts.n
    from counts
    where c.slug = counts.slug
    returning counts.n
  )
  select coalesce(sum(n), 0)::int into inserted_rows
  from updated_counts;

  return query select inserted_rows, greatest(total_rows - inserted_rows, 0);
end;
$$;

revoke execute on function public.insert_officials_import_batch(jsonb) from public;
revoke execute on function public.insert_officials_import_batch(jsonb) from anon;
revoke execute on function public.insert_officials_import_batch(jsonb) from authenticated;
grant execute on function public.insert_officials_import_batch(jsonb) to service_role;