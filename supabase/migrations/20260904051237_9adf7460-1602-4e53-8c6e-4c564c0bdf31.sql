-- Pre-aggregated cache for the /statistics/company-names page.
-- The full scan over 571k company names exceeds the PostgREST statement
-- timeout, so a daily cron refreshes this table and the public RPC reads it.

create table if not exists public.company_name_stats_cache (
  id smallint primary key default 1 check (id = 1),
  payload jsonb not null,
  computed_at timestamptz not null default now()
);

-- Aggregate stats are public data (the page is public), so anon may read the cache.
grant select on public.company_name_stats_cache to anon;
grant select on public.company_name_stats_cache to authenticated;
grant all on public.company_name_stats_cache to service_role;

alter table public.company_name_stats_cache enable row level security;

create policy "Public can read company name stats cache"
  on public.company_name_stats_cache
  for select
  to public
  using (true);

-- Heavy refresh: recomputes the aggregates and upserts the single cache row.
-- Runs as the migration owner (postgres) via pg_cron; not executable by API roles.
create or replace function public.refresh_company_name_stats()
returns void
language plpgsql
security definer
set search_path to 'public'
set statement_timeout to '300s'
as $refresh$
declare
  result jsonb;
begin
  with names as (
    select name from public.companies
  ),
  total as (
    select count(*)::bigint as n from names
  ),
  words as (
    select lower(w) as word, count(*)::bigint as c
    from names,
         lateral regexp_split_to_table(name, '[^A-Za-z0-9Α-Ωα-ωάέήίόύώΆΈΉΊΌΎΏΪΫϊϋΐΰ]+') as w
    where length(w) >= 3
      and upper(w) not in (
        'LTD','LIMITED','ΛΤΔ','ΛΙΜΙΤΕΔ','ΕΠΕ','ΙΚΕ','ΑΕ','ΔΡΑ','ΜΕΠΕ','ΟΕ','ΕΕ',
        'THE','AND','OF','CO','COMPANY','ENTERPRISES','ENTERPRISE','PUBLIC','PLC',
        'HOLDINGS','HOLDING','GROUP','CYPRUS','INTL','INTERNATIONAL'
      )
    group by 1
    order by 2 desc, 1
    limit 200
  ),
  scripts as (
    select
      count(*) filter (where name ~ '[Α-Ωα-ω]' and name !~ '[A-Za-z]')::bigint as greek,
      count(*) filter (where name !~ '[Α-Ωα-ω]' and name ~ '[A-Za-z]')::bigint as latin,
      count(*) filter (where name ~ '[Α-Ωα-ω]' and name ~ '[A-Za-z]')::bigint as mixed,
      count(*) filter (where name !~ '[Α-Ωα-ω]' and name !~ '[A-Za-z]')::bigint as other
    from names
  ),
  letters as (
    select upper(left(name, 1)) as letter, count(*)::bigint as c
    from names
    where upper(left(name, 1)) ~ '^[A-ZΑ-Ω]$'
    group by 1
  ),
  lengths as (
    select case
             when length(name) <= 10 then '1-10'
             when length(name) <= 20 then '11-20'
             when length(name) <= 30 then '21-30'
             when length(name) <= 40 then '31-40'
             else '41+'
           end as bucket,
           count(*)::bigint as c
    from names
    group by 1
  )
  select jsonb_build_object(
    'total', (select n from total),
    'top_words', (select jsonb_agg(jsonb_build_object('word', word, 'count', c)) from words),
    'scripts', (select jsonb_build_object('greek', greek, 'latin', latin, 'mixed', mixed, 'other', other) from scripts),
    'letters', (select jsonb_agg(jsonb_build_object('letter', letter, 'count', c) order by letter) from letters),
    'lengths', (select jsonb_agg(jsonb_build_object('bucket', bucket, 'count', c) order by bucket) from lengths),
    'computed_at', now()
  ) into result;

  insert into public.company_name_stats_cache (id, payload, computed_at)
  values (1, result, now())
  on conflict (id) do update
    set payload = excluded.payload,
        computed_at = excluded.computed_at;
end;
$refresh$;

revoke all on function public.refresh_company_name_stats() from public, anon, authenticated;

-- Public RPC now just reads the pre-computed row (fast, no timeout).
create or replace function public.company_name_stats()
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  select payload from public.company_name_stats_cache where id = 1;
$function$;

-- Daily refresh at 03:15 UTC.
select cron.schedule(
  'company-name-stats-refresh',
  '15 3 * * *',
  $$select public.refresh_company_name_stats()$$
);

-- Seed the cache immediately so the page works right away.
select public.refresh_company_name_stats();