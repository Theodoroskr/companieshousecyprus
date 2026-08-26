import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  getSanctionsChanges,
  getSanctionsDashboard,
  getSanctionsEntryRaw,
  getSanctionsRawFileUrl,
  listSanctionsSourcesFn,
  runSanctionsImportNow,
  setSanctionsSourceActiveFn,
  testSanctionsConnectionNow,
} from "@/lib/sanctions.functions";

export const Route = createFileRoute("/_authenticated/admin/sanctions-data")({
  head: () => ({
    meta: [
      { title: "Sanctions data — Companies House Cyprus admin" },
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

interface WorkerPerf {
  downloadMs?: number;
  hashingMs?: number;
  stagingMs?: number;
  validationMs?: number;
  publishMs?: number;
  archiveMs?: number;
  rssStartMb?: number | null;
  rssPeakMb?: number | null;
  rssEndMb?: number | null;
}

function fmtMb(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)} MB`;
}

function WorkerPerformanceCard({ perf, startedAt }: { perf: WorkerPerf; startedAt: string | null | undefined }) {
  const stageTotal =
    (perf.downloadMs ?? 0) + (perf.validationMs ?? 0) + (perf.archiveMs ?? 0) + (perf.publishMs ?? 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Streaming worker performance
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            last run {fmt(startedAt)} — use this to confirm runtime suitability before activating the schedule
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Peak memory (RSS)" value={fmtMb(perf.rssPeakMb)} />
          <Stat label="Memory at start" value={fmtMb(perf.rssStartMb)} />
          <Stat label="Memory at end" value={fmtMb(perf.rssEndMb)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Download + parse" value={fmtDuration(perf.downloadMs)} />
          <Stat label="Hashing (SHA-256)" value={fmtDuration(perf.hashingMs)} />
          <Stat label="Staging inserts" value={fmtDuration(perf.stagingMs)} />
          <Stat label="Validation" value={fmtDuration(perf.validationMs)} />
          <Stat label="Raw archive" value={fmtDuration(perf.archiveMs)} />
          <Stat label="Publish" value={fmtDuration(perf.publishMs)} />
        </div>
        {stageTotal > 0 ? (
          <p className="text-xs text-muted-foreground">
            Hashing and staging are measured within the download stream (incremental, chunk by chunk); the remaining
            stream time is XML parsing and network I/O. Total staged work ≈ {fmtDuration(stageTotal)}.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

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
  const [sourceCode, setSourceCode] = useState<string | null>(null);
  const [changesFor, setChangesFor] = useState<string | null>(null);
  const [errorFor, setErrorFor] = useState<string | null>(null);
  const [inspectId, setInspectId] = useState("");

  const sources = useQuery({
    queryKey: ["admin", "sanctions-sources"],
    queryFn: () => listSanctionsSourcesFn(),
  });

  const selectedSource = sourceCode ?? sources.data?.[0]?.source_code ?? "EU_FSF";

  const dashboard = useQuery({
    queryKey: ["admin", "sanctions-dashboard", selectedSource],
    queryFn: () => getSanctionsDashboard({ data: { sourceCode: selectedSource } }),
    refetchInterval: 60_000,
  });

  const changes = useQuery({
    queryKey: ["admin", "sanctions-changes", changesFor],
    queryFn: () => getSanctionsChanges({ data: { importId: changesFor! } }),
    enabled: Boolean(changesFor),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "sanctions-dashboard", selectedSource] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "sanctions-sources"] });
  };

  const runNow = useMutation({
    mutationFn: () => runSanctionsImportNow({ data: { sourceCode: selectedSource, force: true } }),
    onSuccess: (result) => {
      if (result.status === "failed") toast.error(result.message);
      else if (result.status === "skipped") toast.info(result.message);
      else if (result.status === "unchanged") toast.info("Source file unchanged — dataset kept as is.");
      else
        toast.success(
          `Import completed: ${result.recordCount ?? 0} active records (+${result.addedCount ?? 0} / ~${result.modifiedCount ?? 0} / -${result.removedCount ?? 0}).`,
        );
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Import failed"),
  });

  const testConnection = useMutation({
    mutationFn: () => testSanctionsConnectionNow({ data: { sourceCode: selectedSource } }),
    onSuccess: (result) => {
      if (result.ok) toast.success(result.detail);
      else toast.error(result.detail);
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Connection test failed"),
  });

  const toggleActive = useMutation({
    mutationFn: (active: boolean) => setSanctionsSourceActiveFn({ data: { sourceCode: selectedSource, active } }),
    onSuccess: (result) => {
      toast.success(result.isActive ? "Scheduled imports activated." : "Scheduled imports paused.");
      invalidate();
    },
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not update source"),
  });

  const download = useMutation({
    mutationFn: (storagePath: string) => getSanctionsRawFileUrl({ data: { storagePath } }),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Could not create link"),
  });

  const inspect = useMutation({
    mutationFn: (recordId: string) =>
      getSanctionsEntryRaw({ data: { sourceCode: selectedSource, sourceRecordId: recordId.trim() } }),
    onError: (error: unknown) => toast.error(error instanceof Error ? error.message : "Record not found"),
  });

  const data = dashboard.data;
  const latest = data?.lastSettled ?? data?.lastAttempt ?? null;
  const failedImport = data?.history.find((i) => i.id === errorFor) ?? null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Sanctions data</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingestion and monitoring of official sanctions lists (EU, UN Security Council). Not yet exposed to
            customers.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => testConnection.mutate()}
            disabled={testConnection.isPending || !data}
          >
            {testConnection.isPending ? "Testing…" : "Test connection"}
          </Button>
          <Button onClick={() => runNow.mutate()} disabled={runNow.isPending || !data}>
            {runNow.isPending ? "Running…" : "Run import now"}
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

      {sources.data && sources.data.length > 1 ? (
        <nav className="flex flex-wrap gap-2">
          {sources.data.map((source) => (
            <button
              key={source.source_code}
              type="button"
              onClick={() => {
                setSourceCode(source.source_code);
                setChangesFor(null);
                setErrorFor(null);
              }}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                selectedSource === source.source_code
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              }`}
            >
              {source.source_name}
              {!source.is_active ? <span className="ml-1 opacity-70">(inactive)</span> : null}
            </button>
          ))}
        </nav>
      ) : null}

      {dashboard.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {dashboard.error ? (
        <p className="text-sm text-red-600">
          {dashboard.error instanceof Error ? dashboard.error.message : "Could not load sanctions status"}
        </p>
      ) : null}

      {data ? (
        <>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
              <CardTitle className="text-base">
                {data.source.name}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {data.source.authority} · {data.source.jurisdiction} · {data.source.format}
                </span>
              </CardTitle>
              <div className="flex items-center gap-2">
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
                <Button
                  size="sm"
                  variant={data.source.isActive ? "outline" : "default"}
                  disabled={toggleActive.isPending}
                  onClick={() => toggleActive.mutate(!data.source.isActive)}
                >
                  {data.source.isActive ? "Pause scheduled imports" : "Activate scheduled imports"}
                </Button>
              </div>
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
                <Stat label="Individuals" value={data.personCount.toLocaleString("en-GB")} />
                <Stat label="Entities" value={data.entityCount.toLocaleString("en-GB")} />
                {data.shipCount > 0 ? <Stat label="Ships" value={data.shipCount.toLocaleString("en-GB")} /> : null}
                {(data as { aircraftCount?: number }).aircraftCount ? (
                  <Stat label="Aircraft" value={((data as { aircraftCount?: number }).aircraftCount ?? 0).toLocaleString("en-GB")} />
                ) : null}
                {(data as { walletCount?: number }).walletCount ? (
                  <Stat
                    label="Crypto wallets"
                    value={((data as { walletCount?: number }).walletCount ?? 0).toLocaleString("en-GB")}
                  />
                ) : null}
                <Stat label="Aliases" value={data.aliasCount.toLocaleString("en-GB")} />
                <Stat label="Identifiers" value={data.identifierCount.toLocaleString("en-GB")} />
                <Stat label="Addresses" value={data.addressCount.toLocaleString("en-GB")} />
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
                <Stat
                  label="Last connection test"
                  value={
                    data.source.lastConnectionTestAt
                      ? `${fmt(data.source.lastConnectionTestAt)} ${data.source.lastConnectionTestOk ? "✓" : "✗"}`
                      : "—"
                  }
                />
              </div>
              <Stat label="Stable source URL" value={<code className="text-xs">{data.source.sourceUrl}</code>} />
              <Stat label="File hash (SHA-256)" value={<code className="text-xs">{latest?.file_hash_sha256 ?? "—"}</code>} />
              <Stat
                label="ETag"
                value={
                  <code className="text-xs">
                    {(latest?.diagnostic_details as { etag?: string } | null)?.etag ?? "—"}
                  </code>
                }
              />
              {data.lastAttempt?.error_message ? (
                <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                  Latest error: {data.lastAttempt.error_message}
                </div>
              ) : null}
            </CardContent>
          </Card>

          {(() => {
            const withPerf = data.history.find(
              (row) =>
                (row.diagnostic_details as { perf?: WorkerPerf } | null)?.perf &&
                typeof (row.diagnostic_details as { perf?: WorkerPerf } | null)?.perf?.downloadMs === "number",
            );
            const perf = (withPerf?.diagnostic_details as { perf?: WorkerPerf } | null)?.perf;
            return perf ? <WorkerPerformanceCard perf={perf} startedAt={withPerf?.started_at} /> : null;
          })()}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inspect a stored record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder={
                    selectedSource === "UN_CONSOLIDATED"
                      ? "e.g. QDi.001"
                      : selectedSource === "UKSL"
                        ? "e.g. RUS0001"
                        : "e.g. 10038"
                  }
                  value={inspectId}
                  onChange={(event) => setInspectId(event.target.value)}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  disabled={inspect.isPending || !inspectId.trim()}
                  onClick={() => inspect.mutate(inspectId)}
                >
                  {inspect.isPending ? "Loading…" : "Inspect raw record"}
                </Button>
              </div>
              {inspect.data ? (
                <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {JSON.stringify(inspect.data, null, 2)}
                </pre>
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
