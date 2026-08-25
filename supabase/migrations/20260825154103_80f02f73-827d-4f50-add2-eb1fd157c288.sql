alter table public.import_runs
  add column if not exists storage_path text,
  add column if not exists file_size bigint,
  add column if not exists bytes_processed bigint default 0,
  add column if not exists stage text default 'uploaded';