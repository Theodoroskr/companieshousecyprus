import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getSitemapMonitorHistory } from "@/lib/admin.functions";

type Sitemap = {
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

type Health = {
  checkedAt: string;
  healthy: boolean;
  metadataSource: string | null;
  metadataError: string | null;
  lastGeneratedAt: string | null;
  lastModified: string | null;
  totals: { sitemaps: number; companyChunks: number; companyUrls: number; failing: number };
  errors: Array<{ path: string; status: number | null; error: string | null }>;
  sitemaps: Sitemap[];
};

function fmt(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", { timeZone: "Asia/Nicosia", dateStyle: "medium", timeStyle: "medium" });
}

export const Route = createFileRoute("/_authenticated/admin/sitemap")({
  head: () => ({
    meta: [
      { title: "Sitemap health — Companies House Cyprus admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SitemapHealthPage,
});

type IndexNowStatus = {
  paused: boolean;
  pausedReason: string | null;
  coolingDown?: boolean;
  nextRetryAt?: string | null;
  lastRunAt: string | null;
  lastSubmittedCount: number;
  lastError: string | null;
  pending: number;
  keyLocation: string;
  batchSize: number;
};

type CanonicalCheck = {
  slug: string;
  url: string;
  sample: string;
  status: number | null;
  redirectedTo: string | null;
  canonicalHref: string | null;
  expectedChunk: number | null;
  inSitemap: boolean | null;
  issues: string[];
  ok: boolean;
};

type CanonicalHealth = {
  checkedAt: string;
  healthy: boolean;
  error?: string;
  totals?: {
    companies: number;
    checked: number;
    failing: number;
    sitemapChunksProbed: number;
    missingInSitemap: number;
    redirected: number;
    notOk: number;
    canonicalMismatch: number;
    fetchFailed: number;
    sitemapUnreachable: number;
  };
  failures?: CanonicalCheck[];
  checks?: CanonicalCheck[];
};

type ChangeFeedRun = {
  id: string;
  windowStart: string;
  windowEnd: string;
  changedCount: number;
  enqueuedCount: number;
  chunksRefreshed: number | null;
  indexNowSubmitted: number;
  indexNowStatus: string | null;
  status: string;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

type ChangeFeed = {
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  count: number;
  truncated: boolean;
  ids: string[];
  runs: ChangeFeedRun[];
};




function SitemapHealthPage() {
  const query = useQuery<Health>({
    queryKey: ["sitemap-health"],
    queryFn: async () => {
      const res = await fetch("/api/public/sitemap-health");
      if (!res.ok) throw new Error(`Health check failed (${res.status})`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const indexNow = useQuery<IndexNowStatus>({
    queryKey: ["indexnow-status"],
    queryFn: async () => {
      const res = await fetch("/api/public/indexnow");
      if (!res.ok) throw new Error(`IndexNow status failed (${res.status})`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const canonical = useQuery<CanonicalHealth>({
    queryKey: ["canonical-health"],
    queryFn: async () => {
      const res = await fetch("/api/public/canonical-health");
      if (!res.ok) throw new Error(`Canonical check failed (${res.status})`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const monitor = useQuery({
    queryKey: ["sitemap-monitor-history"],
    queryFn: () => getSitemapMonitorHistory(),
    refetchOnWindowFocus: false,
  });

  const changeFeed = useQuery<ChangeFeed>({
    queryKey: ["change-feed"],
    queryFn: async () => {
      const res = await fetch("/api/public/change-feed?limit=1000");
      if (!res.ok) throw new Error(`Change feed failed (${res.status})`);
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const data = query.data;
  const canonicalData = canonical.data;
  const feed = changeFeed.data;
  const lastRun = feed?.runs?.[0];



  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Sitemap health</h1>
          <p className="text-sm text-muted-foreground">
            Live probe of every sitemap the index advertises — reachability, freshness and fetch errors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            {query.isFetching ? "Checking…" : "Re-check"}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href="/api/public/sitemap-health" target="_blank" rel="noreferrer">JSON</a>
          </Button>
        </div>
      </div>

      {indexNow.data && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">IndexNow (Bing and compatible crawlers)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
            <span>
              <Badge variant={indexNow.data.paused ? "destructive" : "default"}>
                {indexNow.data.paused ? "Paused" : indexNow.data.coolingDown ? "Cooling down" : "Active"}
              </Badge>
            </span>
            <span className="text-muted-foreground">
              Pending URLs: <span className="font-medium text-foreground">{indexNow.data.pending.toLocaleString()}</span>
            </span>
            <span className="text-muted-foreground">
              Last batch: <span className="font-medium text-foreground">{indexNow.data.lastSubmittedCount}</span> of{" "}
              {indexNow.data.batchSize} at {fmt(indexNow.data.lastRunAt)}
            </span>
            {(indexNow.data.pausedReason ?? indexNow.data.lastError) && (
              <span className="text-destructive">{indexNow.data.pausedReason ?? indexNow.data.lastError}</span>
            )}
            {indexNow.data.coolingDown && indexNow.data.nextRetryAt && (
              <span className="text-muted-foreground">Next retry: {fmt(indexNow.data.nextRetryAt)}</span>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Automated monitor (every 15 minutes, email alert on failure)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => monitor.refetch()} disabled={monitor.isFetching}>
            {monitor.isFetching ? "Loading…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {monitor.data && monitor.data.length > 0 ? (
            monitor.data.map((run) => (
              <div key={run.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-border/50 pb-2 last:border-0">
                <Badge variant={run.healthy ? "default" : "destructive"}>{run.healthy ? "Healthy" : "Failing"}</Badge>
                <span className="text-muted-foreground">{fmt(run.checkedAt)}</span>
                <span className="text-muted-foreground">
                  {run.checked} probed · {run.failing} failing
                  {run.durationMs !== null ? ` · ${run.durationMs} ms` : ""}
                </span>
                {run.alerted && <Badge variant="outline">Alert sent{run.alertKind ? ` (${run.alertKind})` : ""}</Badge>}
                {run.failures.length > 0 && (
                  <span className="text-xs text-destructive">
                    {run.failures.map((f) => `${f.path} — ${f.error ?? f.status}`).join("; ")}
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">
              No automated runs recorded yet — the first scheduled check runs within 15 minutes.
            </p>
          )}
        </CardContent>
      </Card>

      {feed && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="text-sm text-muted-foreground">Daily change feed (updated company IDs)</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <a href="/api/public/change-feed" target="_blank" rel="noreferrer">JSON feed</a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => changeFeed.refetch()} disabled={changeFeed.isFetching}>
                {changeFeed.isFetching ? "Loading…" : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <span className="text-muted-foreground">
                Changed since {fmt(feed.windowStart)}:{" "}
                <span className="font-medium text-foreground">{feed.count.toLocaleString()}</span>
                {feed.truncated ? " (capped)" : ""}
              </span>
              {lastRun && (
                <>
                  <span>
                    <Badge variant={lastRun.status === "completed" ? "default" : "destructive"}>
                      Last run: {lastRun.status}
                    </Badge>
                  </span>
                  <span className="text-muted-foreground">
                    Queued <span className="font-medium text-foreground">{lastRun.enqueuedCount.toLocaleString()}</span> ·
                    submitted <span className="font-medium text-foreground">{lastRun.indexNowSubmitted.toLocaleString()}</span> ·
                    chunks {lastRun.chunksRefreshed ?? "—"} · {fmt(lastRun.finishedAt ?? lastRun.startedAt)}
                  </span>
                </>
              )}
            </div>
            {lastRun?.message && <p className="text-xs text-destructive">{lastRun.message}</p>}
            {feed.ids.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Sample IDs: {feed.ids.slice(0, 12).join(", ")}
                {feed.ids.length > 12 ? ` +${feed.ids.length - 12} more` : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}



      {query.isLoading && <p className="text-sm text-muted-foreground">Probing sitemaps…</p>}
      {query.isError && (
        <p className="text-sm text-destructive">{(query.error as Error).message}</p>
      )}


      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
              <CardContent>
                <Badge variant={data.healthy ? "default" : "destructive"}>
                  {data.healthy ? "All reachable" : `${data.totals.failing} failing`}
                </Badge>
                <p className="mt-2 text-xs text-muted-foreground">Checked {fmt(data.checkedAt)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last generated</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{fmt(data.lastGeneratedAt)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Metadata: {data.metadataSource ?? "unavailable"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Last modified</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{fmt(data.lastModified)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Newest company change in the sitemaps</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Coverage</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm font-medium">{data.totals.companyUrls.toLocaleString("en-GB")} company URLs</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.totals.companyChunks} chunks · {data.totals.sitemaps} sitemaps
                </p>
              </CardContent>
            </Card>
          </div>

          {data.metadataError && (
            <p className="mt-4 text-sm text-destructive">Metadata error: {data.metadataError}</p>
          )}

          <Card className="mt-6">
            <CardHeader><CardTitle className="text-base">Sitemaps</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Path</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Content type</th>
                    <th className="px-4 py-2">URLs</th>
                    <th className="px-4 py-2">Last-Modified header</th>
                    <th className="px-4 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sitemaps.map((s) => (
                    <tr key={s.path} className="border-t">
                      <td className="px-4 py-2">
                        <a className="text-copper hover:underline" href={s.path} target="_blank" rel="noreferrer">{s.path}</a>
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={s.ok ? "secondary" : "destructive"}>{s.status ?? "no response"}</Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{s.contentType ?? "—"}</td>
                      <td className="px-4 py-2">{s.urlCount ? s.urlCount.toLocaleString("en-GB") : "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.lastModified ?? "—"}</td>
                      <td className="px-4 py-2 text-destructive">{s.error ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="mt-6">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Canonical URL checks</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Samples recent, chunk-boundary and random companies: each canonical{" "}
              <code>/company/&#123;ID&#125;</code> must return 200 (no redirect) and appear in its sitemap chunk.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => canonical.refetch()} disabled={canonical.isFetching}>
              {canonical.isFetching ? "Checking…" : "Run checks"}
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="/api/public/canonical-health" target="_blank" rel="noreferrer">JSON</a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {canonical.isLoading && <p className="text-sm text-muted-foreground">Probing canonical URLs…</p>}
          {canonical.isError && <p className="text-sm text-destructive">{(canonical.error as Error).message}</p>}
          {canonicalData?.error && <p className="text-sm text-destructive">{canonicalData.error}</p>}

          {canonicalData?.totals && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
                <Badge variant={canonicalData.healthy ? "default" : "destructive"}>
                  {canonicalData.healthy ? "All canonical URLs OK" : `${canonicalData.totals.failing} flagged`}
                </Badge>
                <span className="text-muted-foreground">
                  Checked <span className="font-medium text-foreground">{canonicalData.totals.checked}</span> of{" "}
                  {canonicalData.totals.companies.toLocaleString("en-GB")} companies across{" "}
                  {canonicalData.totals.sitemapChunksProbed} chunks
                </span>
                <span className="text-muted-foreground">
                  Missing in sitemap: <span className="font-medium text-foreground">{canonicalData.totals.missingInSitemap}</span> ·
                  Redirected: <span className="font-medium text-foreground">{canonicalData.totals.redirected}</span> ·
                  Non-200: <span className="font-medium text-foreground">{canonicalData.totals.notOk}</span> ·
                  Canonical mismatch: <span className="font-medium text-foreground">{canonicalData.totals.canonicalMismatch}</span>
                </span>
                <span className="text-muted-foreground">{fmt(canonicalData.checkedAt)}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Company URL</th>
                      <th className="px-4 py-2">Sample</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Sitemap chunk</th>
                      <th className="px-4 py-2">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(canonicalData.failures?.length ? canonicalData.failures : canonicalData.checks ?? []).map((c) => (
                      <tr key={c.slug} className="border-t">
                        <td className="px-4 py-2">
                          <a className="text-copper hover:underline" href={`/company/${c.canonicalSlug ?? c.slug}`} target="_blank" rel="noreferrer">
                            /company/{c.canonicalSlug ?? c.slug}
                          </a>

                          {c.redirectedTo && (
                            <span className="block text-xs text-muted-foreground">→ {c.redirectedTo}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">{c.sample}</td>
                        <td className="px-4 py-2">
                          <Badge variant={c.status === 200 ? "secondary" : "destructive"}>{c.status ?? "no response"}</Badge>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {c.expectedChunk === null ? "—" : `#${c.expectedChunk}`}{" "}
                          {c.inSitemap === null ? "(unknown)" : c.inSitemap ? "· present" : "· missing"}
                        </td>
                        <td className="px-4 py-2 text-destructive">{c.issues.join(", ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
