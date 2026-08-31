# Speed up index transfer to canonical company URLs

## What's true right now

- IndexNow is wired up and working: last run submitted 100 URLs, 41 URLs still pending, and the submitter is in a Bing rate-limit cooldown until 31 Aug 12:00 UTC (it resumes automatically).
- Company sitemaps and the sitemap index are live and list canonical, name-based URLs.
- Search Console has no API that "requests indexing". Google's URL Inspection API only reads what Google already has; only sitemap submission and re-submission can be automated. Anything beyond that has to be done by hand in the Search Console UI.

## What this does

1. **Re-submit every sitemap to Search Console.** List verified properties, pick the one covering the site, and re-submit each sitemap in the index (pages, companies chunks). Re-submitting refreshes Google's crawl scheduling for the canonical URLs.
2. **Read back sitemap status per file** — last downloaded date, warnings, error counts — so we can see whether Google is actually picking up the regenerated chunks.
3. **Queue the highest-value canonical URLs into IndexNow.** Homepage, registry landing pages, guides, directory pages, and the top-traffic company profiles get enqueued as canonical `/company/<name-slug>` paths. Queued work drains automatically on the scheduled runs once the cooldown lifts, respecting the existing 100-URL batch cap and rate-limit rails.
4. **Spot-check with URL Inspection.** Inspect a handful of the top canonical URLs after submission and report Google's current view: indexed or not, which canonical Google picked, and whether the old ID URL is still the one on file.

## Technical notes

- Search Console calls go through the connector gateway with a property resolved at call time from `GET /webmasters/v3/sites` — never a guessed property ID.
- IndexNow queuing reuses the existing `enqueue_indexnow_urls` path in `src/lib/indexnow.server.ts`; no new submission channel, no bypass of the cooldown or the pause rails.
- No changes to canonical logic, redirects, robots, or sitemap contents — this is submission and verification only.

## What you should expect

Index transfer from the old ID URLs to the canonical name URLs is Google's decision and typically takes days to a few weeks. This work removes the delay we control (discovery), not Google's re-evaluation time.
