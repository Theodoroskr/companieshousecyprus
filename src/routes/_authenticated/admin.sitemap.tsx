import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  lastRunAt: string | null;
  lastSubmittedCount: number;
  lastError: string | null;
  pending: number;
  keyLocation: string;
  batchSize: number;
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

  const data = query.data;


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
    </div>
  );
}
