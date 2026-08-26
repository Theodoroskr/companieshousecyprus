ALTER TABLE public.sanctions_imports
  ADD COLUMN IF NOT EXISTS official_digest_sha256 text,
  ADD COLUMN IF NOT EXISTS official_digest_header text,
  ADD COLUMN IF NOT EXISTS digest_mismatch boolean NOT NULL DEFAULT false;