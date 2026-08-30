# Two changes: gradual freshness backfill + ISO transliteration of officer names

## 1. Background job: gradually refresh company page freshness

Company sitemaps now use `content_updated_at` as `lastmod`. A one-shot bulk update
times out, so this runs as a small, repeating background job.

How it works:

- A database function updates a **bounded batch** (e.g. 2,000 rows per run) of company
  records whose freshness stamp is missing or older than their registry record, oldest
  first. Rows stop matching once stamped, so re-runs never redo finished work.
- A scheduled endpoint (`/api/public/content-backfill`) triggers one batch per run,
  protected by the same private job secret the other scheduled jobs use.
- Single-flight lock: the job takes a short lease in the existing `job_state` table, so a
  second overlapping run exits immediately instead of doubling up.
- Pause guard + circuit breaker: the job reads its own `paused` flag first and exits while
  paused; any batch failure records the error and pauses the job instead of looping.
- Schedule: every 10 minutes via the existing cron pattern. It stops doing work on its own
  once no rows remain (each run then completes with zero updates).
- No IndexNow flood: this only touches sitemap freshness. The daily change feed keeps
  driving IndexNow off `updated_at` as it does today.

Reporting: the run result (batch size, rows updated, rows remaining) is returned by the
endpoint and stored as the job's last-run state so progress is observable.

## 2. Transliterate directors and secretary to Latin (ELOT-743)

Officer names currently render exactly as stored — Greek script for most records — while
addresses already pass through the ELOT-743 helper.

- Reuse the existing `greekToLatin` helper (ELOT-743 / ISO 843 style) for officer names on
  the company profile: show the Latin form as the primary name, with the Greek original as
  a secondary line only when it actually differs.
- Apply the same Latin form everywhere the names feed search and AI snippets: the FAQ
  answer listing directors, the profile summary paragraph, and the meta description.
- Suppressed (GDPR) and masked business-name owners are unaffected — they keep showing
  "Name withheld on request" / the masked form.
- Tidy the helper first for personal names: correct final-sigma, accent stripping and the
  `ΜΠ/ΝΤ/ΓΚ` digraphs so names like ΝΤΙΝΟΣ / ΓΙΩΡΓΟΣ come out as expected, with unit tests
  over a set of real Cypriot officer names.

## Technical notes

- New: `src/lib/content-backfill.server.ts`, `src/routes/api/public/content-backfill.ts`,
  one migration adding the batched update function and the `job_state` row (with secret),
  and a `cron.schedule` entry pointing at the stable project URL.
- Changed: `src/lib/format.ts` (name transliteration helper + tests),
  `src/routes/company.$slug.tsx` (officer list rendering, summary, FAQ),
  `src/lib/seo/company-meta.ts` (director names in descriptions).
- No schema change to `companies`; only values of `content_updated_at` are filled in.
