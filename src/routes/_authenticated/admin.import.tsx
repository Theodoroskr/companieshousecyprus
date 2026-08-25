import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  mapAddressRow,
  mapOfficialRow,
  mapOrganisationRow,
  type AddressRecord,
  type CompanyImportRow,
  type OfficialImportRow,
} from "@/lib/registrar-mapping";
import {
  diagnoseCompanyNumber,
  finishImportRun,
  getImportStats,
  importCompanyBatch,
  importOfficialsBatch,
  listImportRuns,
  processImportChunk,
  refreshOfficialsCount,
  startImportRun,
  startServerImport,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/import")({
  head: () => ({
    meta: [
      { title: "Registrar data import | Companies House Cyprus" },
      { name: "description", content: "Upload registrar CSV exports and refresh company records." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminImportPage,
});

const OFFICIALS_BATCH_SIZE = 5_000;
const COMPANY_BATCH_SIZE = 2_000;

type RunState = { active: boolean; label: string; processed: number; failed: number; percent: number };

const idleRun: RunState = { active: false, label: "", processed: 0, failed: 0, percent: 0 };

type ImportRunRow = Awaited<ReturnType<typeof listImportRuns>>[number];
type DiagnosticResult = Awaited<ReturnType<typeof diagnoseCompanyNumber>>;

function parseCsv<T>(
  file: File,
  onRows: (rows: Record<string, string>[], bytes: number) => Promise<void> | void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      chunkSize: 1024 * 512,
      chunk: (results, parser) => {
        parser.pause();
        Promise.resolve(onRows(results.data, results.meta.cursor))
          .then(() => parser.resume())
          .catch((error) => {
            parser.abort();
            reject(error);
          });
      },
      complete: () => resolve(),
      error: (error: unknown) => reject(error),
    });
  });
}

function AdminImportPage() {
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<{ companies: number; officials: number; companiesWithOfficials: number } | null>(
    null,
  );
  const [runs, setRuns] = useState<ImportRunRow[]>([]);
  const [run, setRun] = useState<RunState>(idleRun);
  const [replaceOfficials, setReplaceOfficials] = useState(true);
  const cancelRef = useRef(false);

  const [diagNumber, setDiagNumber] = useState("");
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagResult, setDiagResult] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    const value = diagNumber.trim();
    if (!value) {
      toast.error("Enter a registry number first");
      return;
    }
    setDiagLoading(true);
    try {
      const result = await diagnoseCompanyNumber({ data: { number: value } });
      setDiagResult(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    } finally {
      setDiagLoading(false);
    }
  };


  const orgFileRef = useRef<HTMLInputElement>(null);
  const addrFileRef = useRef<HTMLInputElement>(null);
  const officialsFileRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const [s, r] = await Promise.all([getImportStats(), listImportRuns()]);
    setStats(s);
    setRuns(r);
  };

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load import tools");
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const runCompaniesImport = async () => {
    const orgFile = orgFileRef.current?.files?.[0];
    const addrFile = addrFileRef.current?.files?.[0];
    if (!orgFile) {
      toast.error("Choose the organisations CSV first.");
      return;
    }
    cancelRef.current = false;
    setRun({ active: true, label: "Reading addresses…", processed: 0, failed: 0, percent: 0 });

    try {
      const addresses = new Map<string, AddressRecord>();
      if (addrFile) {
        await parseCsv(addrFile, (rows, bytes) => {
          for (const row of rows) {
            const mapped = mapAddressRow(row);
            if (mapped) addresses.set(mapped.seq, mapped.address);
          }
          setRun((r) => ({
            ...r,
            label: `Reading addresses… ${addresses.size.toLocaleString()} loaded`,
            percent: Math.min(20, Math.round((bytes / addrFile.size) * 20)),
          }));
        });
      }

      const { runId } = await startImportRun({
        data: { kind: "companies", mode: addrFile ? "upsert+addresses" : "upsert", filename: orgFile.name },
      });

      let processed = 0;
      let failed = 0;
      let buffer: CompanyImportRow[] = [];

      const flush = async () => {
        if (buffer.length === 0) return;
        const batch = buffer;
        buffer = [];
        try {
          const res = await importCompanyBatch({ data: { runId, rows: batch } });
          processed += res.inserted;
        } catch (error) {
          failed += batch.length;
          console.error(error);
        }
      };

      await parseCsv(orgFile, async (rows, bytes) => {
        if (cancelRef.current) throw new Error("Cancelled by user");
        for (const row of rows) {
          const mapped = mapOrganisationRow(row, addresses.size ? addresses : undefined);
          if (mapped) buffer.push(mapped);
          else failed += 1;
        }
        while (buffer.length >= COMPANY_BATCH_SIZE) {
          const batch = buffer.slice(0, COMPANY_BATCH_SIZE);
          buffer = buffer.slice(COMPANY_BATCH_SIZE);
          try {
            const res = await importCompanyBatch({ data: { runId, rows: batch } });
            processed += res.inserted;
          } catch (error) {
            failed += batch.length;
            console.error(error);
          }
        }
        setRun({
          active: true,
          label: "Updating companies…",
          processed,
          failed,
          percent: 20 + Math.min(75, Math.round((bytes / orgFile.size) * 75)),
        });
      });
      await flush();

      await finishImportRun({
        data: { runId, status: failed > 0 ? "completed" : "completed", message: `${failed} rows skipped/failed` },
      });
      setRun({ active: false, label: "", processed, failed, percent: 100 });
      toast.success(`Companies updated: ${processed.toLocaleString()} rows (${failed.toLocaleString()} skipped).`);
      await refresh();
    } catch (error) {
      setRun(idleRun);
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  };

  const runOfficialsImport = async () => {
    const file = officialsFileRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose the officials CSV first.");
      return;
    }
    cancelRef.current = false;
    setRun({ active: true, label: "Uploading file to secure storage…", processed: 0, failed: 0, percent: 0 });

    try {
      const storagePath = `officials-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("imports").upload(storagePath, file, {
        contentType: "text/csv",
        upsert: false,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { runId } = await startServerImport({
        data: {
          kind: "officials",
          mode: replaceOfficials ? "replace" : "append",
          filename: file.name,
          storagePath,
          fileSize: file.size,
        },
      });

      setRun((r) => ({
        ...r,
        label: replaceOfficials ? "Clearing existing officials…" : "Processing officials on the server…",
        percent: 5,
      }));

      let lastProcessed = 0;
      let lastFailed = 0;
      let lastBytesProcessed = 0;
      let stalledTicks = 0;
      while (!cancelRef.current) {
        const result = await processImportChunk({ data: { runId } });
        lastProcessed = result.processed;
        lastFailed = result.failed ?? lastFailed;
        if (result.done) break;
        const percent =
          result.bytesProcessed != null && result.fileSize && result.fileSize > 0
            ? Math.min(95, Math.round((result.bytesProcessed / result.fileSize) * 95))
            : 5;
        setRun({
          active: true,
          label: result.stage === "clearing" ? "Clearing existing officials…" : "Processing officials on the server…",
          processed: lastProcessed,
          failed: lastFailed,
          percent,
        });
        // Detect stalls so the user can refresh and resume if needed.
        if (result.bytesProcessed != null && result.bytesProcessed === lastBytesProcessed) {
          stalledTicks += 1;
          if (stalledTicks >= 3) {
            throw new Error(
              "Import appears stalled. Refresh the page and click Resume next to this run to continue.",
            );
          }
        } else {
          stalledTicks = 0;
        }
        lastBytesProcessed = result.bytesProcessed ?? lastBytesProcessed;
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      if (cancelRef.current) throw new Error("Cancelled by user");

      await finishImportRun({
        data: { runId, status: "completed", message: `${lastFailed} skipped` },
      });
      setRun({ active: false, label: "", processed: lastProcessed, failed: lastFailed, percent: 100 });
      toast.success(`Officials imported: ${lastProcessed.toLocaleString()} rows (${lastFailed.toLocaleString()} skipped).`);
      await refresh();
    } catch (error) {
      setRun(idleRun);
      toast.error(error instanceof Error ? error.message : "Import failed");
    }
  };

  const resumeServerImport = async (runId: string, fileSize: number) => {
    cancelRef.current = false;
    setRun({ active: true, label: "Resuming server-side officials import…", processed: 0, failed: 0, percent: 5 });
    try {
      let lastProcessed = 0;
      let lastFailed = 0;
      let lastBytesProcessed = 0;
      let stalledTicks = 0;
      while (!cancelRef.current) {
        const result = await processImportChunk({ data: { runId } });
        lastProcessed = result.processed;
        lastFailed = result.failed ?? lastFailed;
        if (result.done) break;
        const percent =
          result.bytesProcessed != null && fileSize > 0
            ? Math.min(95, Math.round((result.bytesProcessed / fileSize) * 95))
            : 5;
        setRun({
          active: true,
          label: result.stage === "clearing" ? "Clearing existing officials…" : "Resuming server-side officials import…",
          processed: lastProcessed,
          failed: lastFailed,
          percent,
        });
        if (result.bytesProcessed != null && result.bytesProcessed === lastBytesProcessed) {
          stalledTicks += 1;
          if (stalledTicks >= 3) {
            throw new Error("Import appears stalled. Refresh and try Resume again.");
          }
        } else {
          stalledTicks = 0;
        }
        lastBytesProcessed = result.bytesProcessed ?? lastBytesProcessed;
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }
      if (cancelRef.current) throw new Error("Cancelled by user");
      setRun({ active: false, label: "", processed: lastProcessed, failed: lastFailed, percent: 100 });
      toast.success(`Officials import resumed and completed: ${lastProcessed.toLocaleString()} rows.`);
      await refresh();
    } catch (error) {
      setRun(idleRun);
      toast.error(error instanceof Error ? error.message : "Resume failed");
    }
  };

  const runBackfill = async () => {
    setRun({ active: true, label: "Recalculating officials per company…", processed: 0, failed: 0, percent: 50 });
    try {
      const { updated } = await refreshOfficialsCount();
      toast.success(`${updated.toLocaleString()} companies updated.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Backfill failed");
    } finally {
      setRun(idleRun);
    }
  };

  if (checking) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Checking access…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Registrar data import</h1>
          <p className="mt-2 text-muted-foreground">
            Upload the official registrar CSV exports. Imports are incremental and safe to re-run.
          </p>
        </div>
        <SignOutButton />
      </div>

      {stats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["Companies", stats.companies],
            ["Officials", stats.officials],
            ["Companies with officials", stats.companiesWithOfficials],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{label as string}</p>
              <p className="mt-1 text-2xl font-semibold">{(value as number).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {run.active && (
        <div className="mt-6 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">{run.label}</p>
          <Progress value={run.percent} className="mt-3" />
          <p className="mt-2 text-sm text-muted-foreground">
            {run.processed.toLocaleString()} rows written · {run.failed.toLocaleString()} skipped
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => {
              cancelRef.current = true;
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      <section className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Check a registry number</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter a public number such as <code>HE266225</code> to see the company key the importer resolves it to, and
          whether the company and its directors are present in our copy.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="diag-number">Public number</Label>
            <Input
              id="diag-number"
              value={diagNumber}
              placeholder="HE266225"
              onChange={(event) => setDiagNumber(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void runDiagnostic();
              }}
            />
          </div>
          <Button variant="outline" disabled={diagLoading} onClick={() => void runDiagnostic()}>
            {diagLoading ? "Checking…" : "Check"}
          </Button>
        </div>

        {diagResult && (
          <div className="mt-4 space-y-3 rounded-md border bg-muted/30 p-4 text-sm">
            {!diagResult.resolved ? (
              <p className="font-medium text-destructive">
                Could not resolve “{diagResult.input}” to a company key. Check the prefix and number.
              </p>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Company key</p>
                    <p className="font-mono font-medium">{diagResult.slug}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type code</p>
                    <p className="font-medium">{diagResult.typeCode}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Registration number</p>
                    <p className="font-medium">{diagResult.regNumber?.toLocaleString()}</p>
                  </div>
                </div>
                {diagResult.company ? (
                  <p>
                    <span className="font-medium">{diagResult.company.name}</span>{" "}
                    <span className="text-muted-foreground">
                      ({diagResult.company.official_no ?? "—"} · {diagResult.company.status_en ?? "unknown status"})
                    </span>
                  </p>
                ) : (
                  <p className="font-medium text-destructive">
                    No company row stored for {diagResult.slug} — officials rows for it would be skipped.
                  </p>
                )}
                <p>
                  Directors &amp; officials stored:{" "}
                  <span className="font-medium">{diagResult.officialsCount.toLocaleString()}</span>
                  {diagResult.company?.officials_count != null && (
                    <span className="text-muted-foreground">
                      {" "}
                      (cached count {Number(diagResult.company.officials_count).toLocaleString()})
                    </span>
                  )}
                </p>
                {diagResult.officials.length > 0 && (
                  <ul className="space-y-1">
                    {diagResult.officials.map((official, index) => (
                      <li key={`${official.person_name}-${index}`} className="text-muted-foreground">
                        {official.person_name}
                        {official.position_en || official.position_el
                          ? ` — ${official.position_en ?? official.position_el}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border bg-card p-6">

        <h2 className="text-xl font-semibold">Companies &amp; new registrations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload <code>organisations_*.csv</code>. New companies are added, existing ones are updated (name, status,
          dates). Add <code>registered_office_*.csv</code> to refresh addresses at the same time.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-file">Organisations CSV (required)</Label>
            <Input id="org-file" type="file" accept=".csv,text/csv" ref={orgFileRef} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addr-file">Registered office CSV (optional)</Label>
            <Input id="addr-file" type="file" accept=".csv,text/csv" ref={addrFileRef} />
          </div>
        </div>
        <Button className="mt-4" disabled={run.active} onClick={runCompaniesImport}>
          Import companies
        </Button>
      </section>

      <section className="mt-6 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Officials</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload <code>organisation_officials_*.csv</code>. Officials for unknown companies are skipped, and the
          per-company officials count is recalculated when the import finishes.
        </p>
        <Alert className="mt-4" variant="default">
          <AlertTitle>Keep this tab open</AlertTitle>
          <AlertDescription>
            The file is uploaded to secure storage and then processed in 1&nbsp;MB chunks by the server. Each chunk is
            short, but the browser must stay open to request the next chunk. Do not close or background this tab until
            the import reaches 100%.
          </AlertDescription>
        </Alert>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="officials-file">Officials CSV</Label>
            <Input id="officials-file" type="file" accept=".csv,text/csv" ref={officialsFileRef} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="replace" checked={replaceOfficials} onCheckedChange={setReplaceOfficials} />
            <Label htmlFor="replace" className="font-normal">
              Replace all existing officials (recommended — the registrar export is a full snapshot)
            </Label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button disabled={run.active} onClick={runOfficialsImport}>
            Import officials
          </Button>
          <Button variant="outline" disabled={run.active} onClick={runBackfill}>
            Re-run officials count backfill
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold">Recent imports</h2>
        <ul className="mt-4 divide-y">
          {runs.length === 0 && <li className="py-3 text-sm text-muted-foreground">No imports yet.</li>}
          {runs.map((r) => {
            const isServerSide = Boolean(r.storage_path);
            const canResume = isServerSide && r.status === "running" && (r.bytes_processed ?? 0) < (r.file_size ?? 0);
            return (
              <li key={r.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {r.kind} · {r.mode}
                    {isServerSide && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">server</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {r.filename ?? "—"} · {r.status} · {r.rows_processed.toLocaleString()} rows ·{" "}
                  {r.rows_failed.toLocaleString()} skipped
                  {isServerSide && r.file_size != null && r.file_size > 0 && (
                    <>
                      {" · "}
                      {Math.round(((r.bytes_processed ?? 0) / r.file_size) * 100)}%
                      {" ("}
                      {(r.bytes_processed ?? 0).toLocaleString()} / {r.file_size.toLocaleString()} bytes{")"}
                    </>
                  )}
                  {r.message ? ` · ${r.message}` : ""}
                </p>
                {canResume && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={run.active}
                    onClick={() => resumeServerImport(r.id, r.file_size ?? 0)}
                  >
                    Resume
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
