import { createFileRoute } from "@tanstack/react-router";
import { getSitemapIndex } from "@/lib/companies.functions";

/**
 * Public, read-only sitemap health report. Probes every sitemap URL the index
 * advertises and reports reachability, content type, freshness and any fetch
 * error. No customer or account data is involved.
 */
const CANONICAL_ORIGIN = "https://companieshousecyprus.com";

type Probe = {
  url: string;
  path: string;
  kind: "index" | "pages" | "companies";
  ok: boolean;
  status: number | null;
  contentType: string | null;
  lastModified: string | null;
  urlCount: number | null;
  lastmod: string | null;
  error: string | null;
};

async function probe(origin: string, path: string, kind: Probe["kind"], meta?: { urlCount: number; lastmod: string | null }): Promise<Probe> {
  const base: Probe = {
    url: `${CANONICAL_ORIGIN}${path}`,
    path,
    kind,
    ok: false,
    status: null,
    contentType: null,
    lastModified: null,
    urlCount: meta?.urlCount ?? null,
    lastmod: meta?.lastmod ?? null,
    error: null,
  };
  try {
    const res = await fetch(`${origin}${path}`, { method: "GET", headers: { "user-agent": "chc-sitemap-health" } });
    // Drain the body so the connection closes; we only need headers + status.
    await res.arrayBuffer();
    const contentType = res.headers.get("content-type");
    const isXml = !!contentType && contentType.includes("xml");
    return {
      ...base,
      ok: res.ok && isXml,
      status: res.status,
      contentType,
      lastModified: res.headers.get("last-modified"),
      error: res.ok ? (isXml ? null : `unexpected content-type: ${contentType ?? "none"}`) : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "fetch failed" };
  }
}

export const Route = createFileRoute("/api/public/sitemap-health")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;

        let meta: Awaited<ReturnType<typeof getSitemapIndex>> | null = null;
        let metaError: string | null = null;
        try {
          meta = await getSitemapIndex();
        } catch (err) {
          metaError = err instanceof Error ? err.message : "metadata unavailable";
        }

        const chunks = meta?.chunks ?? [];
        const targets: Array<Promise<Probe>> = [
          probe(origin, "/sitemap.xml", "index"),
          probe(origin, "/sitemaps/pages.xml", "pages"),
          ...chunks.map((chunk) =>
            probe(origin, `/sitemaps/companies/${chunk.index}.xml`, "companies", {
              urlCount: chunk.urlCount,
              lastmod: chunk.lastmod,
            }),
          ),
        ];

        const sitemaps = await Promise.all(targets);
        const failures = sitemaps.filter((s) => !s.ok);

        const refreshedTimes = chunks
          .map((c) => (c.refreshedAt ? new Date(c.refreshedAt).getTime() : NaN))
          .filter((t) => !Number.isNaN(t));
        const lastmodTimes = chunks
          .map((c) => (c.lastmod ? new Date(c.lastmod).getTime() : NaN))
          .filter((t) => !Number.isNaN(t));

        const body = {
          checkedAt: new Date().toISOString(),
          healthy: failures.length === 0 && !metaError,
          metadataSource: meta?.source ?? null,
          metadataError: metaError,
          // When the freshness metadata was last recomputed (hourly cron + after imports).
          lastGeneratedAt: refreshedTimes.length ? new Date(Math.max(...refreshedTimes)).toISOString() : null,
          // Newest company record change represented in the sitemaps.
          lastModified: lastmodTimes.length ? new Date(Math.max(...lastmodTimes)).toISOString() : null,
          totals: {
            sitemaps: sitemaps.length,
            companyChunks: chunks.length,
            companyUrls: chunks.reduce((sum, c) => sum + (c.urlCount ?? 0), 0),
            failing: failures.length,
          },
          errors: failures.map((f) => ({ path: f.path, status: f.status, error: f.error })),
          sitemaps,
        };

        return Response.json(body, {
          headers: { "cache-control": "public, max-age=300" },
        });
      },
    },
  },
});
