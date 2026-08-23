import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
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
  claimFirstAdmin,
  clearOfficials,
  finishImportRun,
  getAdminContext,
  getImportStats,
  importCompanyBatch,
  importOfficialsBatch,
  listImportRuns,
  refreshOfficialsCount,
  startImportRun,
} from "@/lib/admin.functions";

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

const BATCH_SIZE = 500;

type RunState = { active: boolean; label: string; processed: number; failed: number; percent: number };

const idleRun: RunState = { active: false, label: "", processed: 0, failed: 0, percent: 0 };

type ImportRunRow = Awaited<ReturnType<typeof listImportRuns>>[number];

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
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCount, setAdminCount] = useState(0);
  const [stats, setStats] = useState<{ companies: number; officials: number; companiesWithOfficials: number } | null>(
    null,
  );
  const [runs, setRuns] = useState<ImportRunRow[]>([]);
  const [run, setRun] = useState<RunState>(idleRun);
  const [replaceOfficials, setReplaceOfficials] = useState(true);
  const cancelRef = useRef(false);

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
        const ctx = await getAdminContext();
        setIsAdmin(ctx.isAdmin);
        setAdminCount(ctx.adminCount);
        if (ctx.isAdmin) await refresh();
      } catch {
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const claim = async () => {
    try {
      await claimFirstAdmin();
      toast.success("You are now an administrator.");
      setIsAdmin(true);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not grant admin access");
    }
  };

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
        while (buffer.length >= BATCH_SIZE) {
          const batch = buffer.slice(0, BATCH_SIZE);
          buffer = buffer.slice(BATCH_SIZE);
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
    setRun({ active: true, label: "Preparing…", processed: 0, failed: 0, percent: 0 });

    try {
      const { runId } = await startImportRun({
        data: { kind: "officials", mode: replaceOfficials ? "replace" : "append", filename: file.name },
      });
      if (replaceOfficials) {
        setRun((r) => ({ ...r, label: "Clearing existing officials…" }));
        await clearOfficials();
      }

      let processed = 0;
      let failed = 0;
      let buffer: OfficialImportRow[] = [];

      const send = async (batch: OfficialImportRow[]) => {
        try {
          const res = await importOfficialsBatch({ data: { runId, rows: batch } });
          processed += res.inserted;
          failed += res.skipped;
        } catch (error) {
          failed += batch.length;
          console.error(error);
        }
      };

      await parseCsv(file, async (rows, bytes) => {
        if (cancelRef.current) throw new Error("Cancelled by user");
        for (const row of rows) {
          const mapped = mapOfficialRow(row);
          if (mapped) buffer.push(mapped);
          else failed += 1;
        }
        while (buffer.length >= BATCH_SIZE) {
          const batch = buffer.slice(0, BATCH_SIZE);
          buffer = buffer.slice(BATCH_SIZE);
          await send(batch);
        }
        setRun({
          active: true,
          label: "Importing officials…",
          processed,
          failed,
          percent: Math.min(92, Math.round((bytes / file.size) * 92)),
        });
      });
      if (buffer.length) await send(buffer);

      setRun((r) => ({ ...r, label: "Recalculating officials per company…", percent: 96 }));
      const { updated } = await refreshOfficialsCount();
      await finishImportRun({
        data: { runId, status: "completed", message: `${failed} skipped, ${updated} company counts updated` },
      });
      setRun({ active: false, label: "", processed, failed, percent: 100 });
      toast.success(`Officials imported: ${processed.toLocaleString()} rows (${failed.toLocaleString()} skipped).`);
      await refresh();
    } catch (error) {
      setRun(idleRun);
      toast.error(error instanceof Error ? error.message : "Import failed");
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

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold tracking-tight">Admin access required</h1>
        {adminCount === 0 ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              No administrator exists yet. Claim the first admin account for this signed-in user.
            </p>
            <Button className="mt-6" onClick={claim}>
              Make me administrator
            </Button>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            This account is not an administrator. Ask an existing admin to grant you access.
          </p>
        )}
        <Button variant="outline" className="mt-4 w-full" onClick={signOut}>
          Sign out
        </Button>
      </div>
    );
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
        <Button variant="outline" onClick={signOut}>
          Sign out
        </Button>
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
          {runs.map((r) => (
            <li key={r.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {r.kind} · {r.mode}
                </span>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {r.filename ?? "—"} · {r.status} · {r.rows_processed.toLocaleString()} rows ·{" "}
                {r.rows_failed.toLocaleString()} skipped
                {r.message ? ` · ${r.message}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
