import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getSanctionsChanges,
  getSanctionsDashboard,
  getSanctionsRawFileUrl,
  runSanctionsImportNow,
} from "@/lib/sanctions.functions";

export const Route = createFileRoute("/_authenticated/admin/sanctions-data")({
  head: () => ({
    meta: [
      { title: "EU sanctions data — Companies House Cyprus admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SanctionsDataPage,
});

function fmt(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-GB", { timeZone: "Asia/Nicosia", dateStyle: "medium", timeStyle: "short" });
}

function fmtBytes(value: number | null | undefined): string {
  if (!value) return "—";
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDuration(ms: number | null | undefined): string {
  if (!ms || ms < 0) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

const STATUS_TONE: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  unchanged: "bg-sky-100 text-sky-800",
  failed: "bg-red-100 text-red-800",
};

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 break-all text-sm font-medium">{value}</div>
    </div>
  );
}

function SanctionsDataPage() {
  const queryClient = useQueryClient();
  const [changesFor, setChangesFor] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<string | null>(null);

  const dashboard = useQuery({
    queryKey: ["admin", "sanctions-dashboard"],
    queryFn: () => getSanctionsDashboard(),
    refetchInterval: 60_000,
  });

  const changes = useQuery({
    queryKey: ["admin", "sanctions-changes", changesFor],
    queryFn: () => getSanctionsChanges({ data: { importId: changesFor! } }),
    enabled: Boolean(changesFor),
  });

  const runNow = useMutation({
    mutationFn: () => runSanctionsImportNow(),
    onSuccess: (result) => {
      if (result.status === "failed") toast.error(result.message);
      else if (result.status === "skipped") toast.info(result.message);
      else if (result.status === "unchanged") toast.info("Source file unchanged — dataset kept as is.");
      else
        toast.success(
          `Import completed: ${result.recordCount ?? 0} active records (+${result.addedCount ?? 0} / ~${result.modifiedCount ?? 0} / -${result.removedCount ?? 0}).`,
        );
      void queryClient.invalidateQueries({ queryKey: ["admin", "sanctions-dashboard"] });
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Import failed"),
  });

  const download = useMutation({
    mutationFn: (storagePath: string) => getSanctionsRawFileUrl({ data: { storagePath } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not create link"),
  });

  const data = dashboard.data;
  const latest = data?.lastSettled ?? data?.lastAttempt ?? null;
  const failedImport = data?.history.find((i) => i.id === errorFor) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">EU sanctions data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingestion and monitoring of the official EU Consolidated Financial Sanctions List. Not yet exposed to
            customers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending}>
            {runNow.isPending ? "Running…" : "Run update now"}
          </Button>
          {data?.source.informationUrl ? (
            <Button variant="outline" asChild>
              <a href={data.source.informationUrl} target="_blank" rel="noreferrer noopener">
                Source information
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      {dashboard.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {dashboard.error ? (
        <p className="text-sm text-red-600">
          {dashboard.error instanceof Error ? dashboard.error.message : "Could not load sanctions status"}
        </p>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="text-base">
                {data.source.name}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {data.source.authority} · {data.source.jurisdiction} · {data.source.format}
                </span>
              </CardTitle>
              <Badge
                className={
                  data.feedStatus === "healthy"
                    ? "bg-emerald-100 text-emerald-800"
                    : data.feedStatus === "warning"
                      ? "bg-amber-100 text-amber-900"
                      : "bg-red-100 text-red-800"
                }
              >
                {data.feedStatus === "healthy" ? "Healthy" : data.feedStatus === "warning" ? "Warning" : "Failed"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.warnings.length > 0 ? (
                <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  {data.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Active records" value={data.activeCount.toLocaleString("en-GB")} />
                <Stat label="Last attempted update" value={fmt(data.lastAttempt?.started_at)} />
                <Stat label="Last successful update" value={fmt(data.lastSettled?.completed_at)} />
                <Stat label="Next scheduled update" value={fmt(data.nextScheduledAt)} />
                <Stat label="Source Last-Modified" value={fmt(latest?.source_last_modified)} />
                <Stat label="File size" value={fmtBytes(latest?.file_size_bytes)} />
                <Stat label="Import duration" value={fmtDuration(data.durationMs)} />
                <Stat
                  label="Changes (last successful)"
                  value={`+${data.lastSuccess?.added_count ?? 0} / ~${data.lastSuccess?.modified_count ?? 0} / -${data.lastSuccess?.removed_count ?? 0}`}
                />
              </div>
              <Stat label="File hash (SHA-256)" value={<code className="text-xs">{latest?.file_hash_sha256 ?? "—"}</code>} />
              {data.lastAttempt?.error_message ? (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  Latest error: {data.lastAttempt.error_message}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import history</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="py-2">Started</th>
                    <th>Status</th>
                    <th>Records</th>
                    <th>Added</th>
                    <th>Modified</th>
                    <th>Removed</th>
                    <th>Size</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.history.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="py-2">{fmt(row.started_at)}</td>
                      <td>
                        <Badge className={STATUS_TONE[row.status] ?? "bg-muted text-foreground"}>{row.status}</Badge>
                      </td>
                      <td>{row.record_count?.toLocaleString("en-GB") ?? "—"}</td>
                      <td>{row.added_count}</td>
                      <td>{row.modified_count}</td>
                      <td>{row.removed_count}</td>
                      <td>{fmtBytes(row.file_size_bytes)}</td>
                      <td className="space-x-2 py-2">
                        <Button size="sm" variant="outline" onClick={() => setChangesFor(row.id)}>
                          Changes
                        </Button>
                        {row.error_message ? (
                          <Button size="sm" variant="outline" onClick={() => setErrorFor(row.id)}>
                            Error
                          </Button>
                        ) : null}
                        {row.storage_path ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={download.isPending}
                            onClick={() => download.mutate(row.storage_path!)}
                          >
                            Raw file
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {data.history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-4 text-muted-foreground">
                        No imports yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {failedImport ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Error details</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setErrorFor(null)}>
                  Close
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-red-700">{failedImport.error_message}</p>
                <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(failedImport.diagnostic_details ?? {}, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          {changesFor ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Change log</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setChangesFor(null)}>
                  Close
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {changes.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="py-2">Record ID</th>
                      <th>Change</th>
                      <th>Previous name</th>
                      <th>New name</th>
                      <th>Detected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(changes.data ?? []).map((row) => (
                      <tr key={row.id} className="border-t">
                        <td className="py-2 font-mono text-xs">{row.sourceRecordId}</td>
                        <td>{row.label}</td>
                        <td>{row.previousName ?? "—"}</td>
                        <td>{row.newName ?? "—"}</td>
                        <td>{fmt(row.detectedAt)}</td>
                      </tr>
                    ))}
                    {changes.data && changes.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-muted-foreground">
                          No changes recorded for this import.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
