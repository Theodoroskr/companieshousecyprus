import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalPath,
  canonicalUrl,
  chunkIndexForRank,
  evaluateCheck,
  extractLocs,
  type CanonicalCheck,
} from "@/lib/seo/canonical-health";
import { sampleCompanySlugs, slugRank } from "@/lib/seo/canonical-health.server";

/**
 * Public, read-only canonical URL health report.
 *
 * For a sample of company records it confirms that
 *   - `/company/{ID}` answers 200 (not a redirect, not a 404),
 *   - the rendered page's rel=canonical matches the canonical URL,
 *   - and the canonical URL is listed in the sitemap chunk that should hold it.
 * Anything else is flagged. No customer or account data is involved.
 */

const MAX_SAMPLE = 60;

async function fetchChunkLocs(origin: string, index: number): Promise<{ locs: Set<string> | null; error: string | null }> {
  try {
    const res = await fetch(`${origin}/sitemaps/companies/${index}.xml`, {
      headers: { "user-agent": "chc-canonical-health" },
    });
    if (!res.ok) return { locs: null, error: `sitemap chunk ${index}: HTTP ${res.status}` };
    return { locs: extractLocs(await res.text()), error: null };
  } catch (err) {
    return { locs: null, error: err instanceof Error ? err.message : "sitemap fetch failed" };
  }
}

export const Route = createFileRoute("/api/public/canonical-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = url.origin;
        const num = (name: string, fallback: number, max: number) => {
          const raw = Number(url.searchParams.get(name));
          if (!Number.isFinite(raw) || raw < 0) return fallback;
          return Math.min(Math.floor(raw), max);
        };
        const explicit = (url.searchParams.get("slugs") ?? "")
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
          .slice(0, MAX_SAMPLE);

        let sampled: Awaited<ReturnType<typeof sampleCompanySlugs>>;
        try {
          sampled = await sampleCompanySlugs({
            recent: num("recent", 10, MAX_SAMPLE),
            random: num("random", 10, MAX_SAMPLE),
            boundaries: url.searchParams.get("boundaries") !== "0",
            explicit,
          });
        } catch (err) {
          return Response.json(
            {
              checkedAt: new Date().toISOString(),
              healthy: false,
              error: err instanceof Error ? err.message : "sampling failed",
            },
            { status: 200, headers: { "cache-control": "no-store" } },
          );
        }

        const samples = sampled.samples.slice(0, MAX_SAMPLE);

        // Resolve which sitemap chunk each sample must appear in, then fetch
        // each distinct chunk once and reuse its <loc> set.
        const ranks = await Promise.all(
          samples.map(async (s) => {
            try {
              return { slug: s.slug, chunk: chunkIndexForRank(await slugRank(s.slug)), error: null as string | null };
            } catch (err) {
              return { slug: s.slug, chunk: null, error: err instanceof Error ? err.message : "rank failed" };
            }
          }),
        );
        const chunkIndexes = Array.from(new Set(ranks.map((r) => r.chunk).filter((c): c is number => c !== null)));
        const chunkResults = new Map<number, Awaited<ReturnType<typeof fetchChunkLocs>>>();
        await Promise.all(
          chunkIndexes.map(async (index) => chunkResults.set(index, await fetchChunkLocs(origin, index))),
        );

        const checks: CanonicalCheck[] = await Promise.all(
          samples.map(async (s, i) => {
            const rank = ranks[i]!;
            const chunk = rank.chunk;
            const chunkResult = chunk === null ? null : chunkResults.get(chunk) ?? null;

            let status: number | null = null;
            let location: string | null = null;
            let html: string | null = null;
            let fetchError: string | null = rank.error;
            try {
              const res = await fetch(`${origin}${canonicalPath(s.canonicalSlug)}`, {
                redirect: "manual",
                headers: { "user-agent": "chc-canonical-health" },
              });
              status = res.status;
              location = res.headers.get("location");
              const body = await res.text();
              html = status === 200 ? body : null;
            } catch (err) {
              fetchError = err instanceof Error ? err.message : "page fetch failed";
            }

            // Confirm the registry-ID URL still 301s to the canonical URL.
            let idStatus: number | null = null;
            let idLocation: string | null = null;
            if (s.canonicalSlug !== s.slug) {
              try {
                const res = await fetch(`${origin}${canonicalPath(s.slug)}`, {
                  method: "HEAD",
                  redirect: "manual",
                  headers: { "user-agent": "chc-canonical-health" },
                });
                idStatus = res.status;
                idLocation = res.headers.get("location");
              } catch {
                idStatus = null;
              }
            }

            return evaluateCheck({
              slug: s.slug,
              canonicalSlug: s.canonicalSlug,
              sample: s.sample,
              status,
              location,
              html,
              fetchError,
              expectedChunk: chunk,
              inSitemap: chunkResult?.locs ? chunkResult.locs.has(canonicalUrl(s.canonicalSlug)) : null,
              sitemapError: chunkResult?.error ?? (chunk === null ? rank.error : null),
              idStatus,
              idLocation,
            });
          }),
        );

        const failing = checks.filter((c) => !c.ok);
        const countIssue = (issue: string) => checks.filter((c) => c.issues.includes(issue as never)).length;

        return Response.json(
          {
            checkedAt: new Date().toISOString(),
            healthy: failing.length === 0,
            totals: {
              companies: sampled.total,
              checked: checks.length,
              failing: failing.length,
              sitemapChunksProbed: chunkIndexes.length,
              missingInSitemap: countIssue("missing-in-sitemap"),
              redirected: countIssue("redirected"),
              notOk: countIssue("not-200"),
              canonicalMismatch: countIssue("canonical-mismatch"),
              fetchFailed: countIssue("fetch-failed"),
              sitemapUnreachable: countIssue("sitemap-unreachable"),
              idUrlNotRedirecting: countIssue("id-url-not-redirecting"),
            },
            failures: failing,
            checks,
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
