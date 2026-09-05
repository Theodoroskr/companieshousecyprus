/**
 * Automated monthly registry refresh.
 *
 * Polls the Cyprus open-data portal file headers (Last-Modified/size) roughly
 * once a week; when a new monthly export appears, downloads and imports the
 * changed files in resumable byte-range slices driven by the 5-minute cron
 * worker. Reuses the exact mapping/normalisation of manual admin uploads
 * (`registrar-mapping`) and the same import_runs history, so behaviour and
 * audit trails are identical. After completion it emails a verification
 * summary to the office inbox.
 *
 * GDPR note: official names are imported raw, exactly like manual uploads.
 * Public masking/suppression is applied at read time by the existing RPCs,
 * so no extra post-import step is required.
 *
 * Monitoring note: company rows are written through the same upsert path as
 * manual imports; the daily monitoring job diffs watched companies against
 * the registry and emails watchers on any change.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import type { Database } from "@/integrations/supabase/types";
import {
  mapAddressRow,
  mapOfficialRow,
  mapOrganisationRow,
  type AddressRecord,
  type CompanyImportRow,
  type OfficialImportRow,
} from "@/lib/registrar-mapping";
import {
  closeRun,
  insertOfficials,
  runRefreshOfficialsCount,
  truncateOfficials,
  upsertCompanies,
} from "@/lib/admin.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const JOB_KEY = "registry_sync";
const OFFICE_EMAIL = "info@companieshousecyprus.com";
const CHUNK_BYTES = 4 * 1024 * 1024; // 4 MiB per slice
const TICK_BUDGET_MS = 25_000; // process slices for at most this long per invocation
const DETECT_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000; // weekly header check
const MAX_ATTEMPTS = 6;
const OFFICIALS_INSERT_BATCH = 500;
const COMPANY_UPSERT_BATCH = 2_000;
const ADDRESS_UPSERT_BATCH = 1_000;

type FileKey = "addresses" | "organisations" | "officials";

const FILES: { key: FileKey; url: string }[] = [
  { key: "addresses", url: "https://data.gov.cy/sites/default/files/registered_office_99.csv" },
  { key: "organisations", url: "https://data.gov.cy/sites/default/files/organisations_97.csv" },
  { key: "officials", url: "https://data.gov.cy/sites/default/files/organisation_officials_86.csv" },
];

type Db = SupabaseClient<Database>;

type JobRow = Database["public"]["Tables"]["registry_sync_job"]["Row"];

function client(): Db {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase service credentials");
  const isNewKey = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

export async function verifyRegistrySyncSecret(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const supabase = client();
  const { data } = await supabase.from("job_state").select("secret").eq("key", JOB_KEY).maybeSingle();
  const secret = (data as { secret?: string | null } | null)?.secret;
  return !!secret && secret.length === token.length && secret === token;
}

// ---------------------------------------------------------------------------
// Small DB helpers
// ---------------------------------------------------------------------------

async function bumpRun(supabase: Db, runId: string, processed: number, failed: number) {
  const { data } = await supabase
    .from("import_runs")
    .select("rows_processed, rows_failed")
    .eq("id", runId)
    .single();
  await supabase
    .from("import_runs")
    .update({
      rows_processed: (data?.rows_processed ?? 0) + processed,
      rows_failed: (data?.rows_failed ?? 0) + failed,
    })
    .eq("id", runId);
}

async function readRunRow(supabase: Db, runId: string) {
  const { data, error } = await supabase
    .from("import_runs")
    .select("id, status, stage, storage_path, file_size, bytes_processed, rows_processed, rows_failed")
    .eq("id", runId)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Import run not found");
  return data;
}

async function setJob(supabase: Db, patch: Record<string, unknown>) {
  const { error } = await supabase
    .from("registry_sync_job")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", true);
  if (error) throw new Error(error.message);
}

async function stagingCount(supabase: Db): Promise<number> {
  const { count } = await supabase
    .from("registry_address_stage")
    .select("seq", { count: "exact", head: true });
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Remote CSV slicing (Range requests against the open-data portal)
// ---------------------------------------------------------------------------

function findLastNewline(bytes: Uint8Array, fromIndex: number) {
  for (let i = bytes.length - 1; i >= fromIndex; i -= 1) {
    if (bytes[i] === 10) return i;
  }
  return -1;
}

async function fetchRange(url: string, start: number, endInclusive: number): Promise<Uint8Array> {
  const response = await fetch(url, { headers: { Range: `bytes=${start}-${endInclusive}` } });
  if (!response.ok && response.status !== 206) {
    throw new Error(`Download failed (${response.status}) for ${url}`);
  }
  return new Uint8Array(await response.arrayBuffer());
}

async function readCsvHeader(url: string) {
  const bytes = await fetchRange(url, 0, 65535);
  const newline = bytes.indexOf(10);
  const end = newline === -1 ? bytes.length : newline;
  return new TextDecoder("utf-8").decode(bytes.slice(0, end)).replace(/^﻿/, "").replace(/\r$/, "");
}

/** Read the next aligned chunk of a remote CSV. Returns null when finished. */
async function readChunk(url: string, start: number, fileSize: number) {
  if (start >= fileSize) return null;
  const end = Math.min(fileSize, start + CHUNK_BYTES);
  const rangeStart = start > 0 ? Math.max(0, start - 1) : 0;
  const bytes = await fetchRange(url, rangeStart, end - 1);

  let parseStartByte = 0;
  if (start > 0) {
    if (bytes[0] === 10) {
      parseStartByte = 1;
    } else {
      const firstNewline = bytes.indexOf(10);
      if (firstNewline === -1) return { rows: [] as Record<string, string>[], nextByte: end };
      parseStartByte = firstNewline + 1;
    }
  }

  let parseEndByte = bytes.length;
  if (end < fileSize) {
    const lastNewline = findLastNewline(bytes, parseStartByte);
    if (lastNewline === -1) return { rows: [] as Record<string, string>[], nextByte: end };
    parseEndByte = lastNewline + 1;
  }

  const decoder = new TextDecoder("utf-8");
  const chunkText = decoder.decode(bytes.slice(parseStartByte, parseEndByte));
  const header = start === 0 ? null : await readCsvHeader(url);
  const csvText = header ? `${header}\n${chunkText}` : chunkText;
  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });
  return { rows: parsed.data, nextByte: Math.max(start, rangeStart + parseEndByte) };
}

// ---------------------------------------------------------------------------
// Phase processing — one slice per call; resume cursor lives in import_runs
// ---------------------------------------------------------------------------

async function ensureRun(supabase: Db, job: JobRow, key: FileKey): Promise<string> {
  const runIds = (job.run_ids ?? {}) as Record<string, string>;
  if (runIds[key]) return runIds[key];
  const file = FILES.find((f) => f.key === key)!;
  const { data: state } = await supabase
    .from("registry_sync_state")
    .select("size")
    .eq("file_key", key)
    .single();
  const size = Number(state?.size ?? 0);
  const { data, error } = await supabase
    .from("import_runs")
    .insert({
      kind: "registry_auto",
      mode: key,
      filename: file.url.split("/").pop() ?? file.url,
      status: "running",
      created_by: null,
      storage_path: file.url,
      file_size: size,
      bytes_processed: 0,
      stage: key === "officials" ? "truncate" : "processing",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not start import run");
  await setJob(supabase, { run_ids: { ...runIds, [key]: data.id } });
  (job.run_ids as Record<string, string>)[key] = data.id;
  return data.id;
}

async function processAddressesSlice(supabase: Db, runId: string): Promise<boolean> {
  const run = await readRunRow(supabase, runId);
  const url = run.storage_path!;
  const fileSize = Number(run.file_size ?? 0);
  const chunk = await readChunk(url, Number(run.bytes_processed ?? 0), fileSize);
  if (!chunk) return true;

  let failed = 0;
  let written = 0;
  const staged: { seq: string; payload: AddressRecord }[] = [];
  for (const row of chunk.rows) {
    const mapped = mapAddressRow(row);
    if (mapped) staged.push({ seq: mapped.seq, payload: mapped.address });
    else failed += 1;
  }
  for (let i = 0; i < staged.length; i += ADDRESS_UPSERT_BATCH) {
    const batch = staged.slice(i, i + ADDRESS_UPSERT_BATCH);
    const { error } = await supabase
      .from("registry_address_stage")
      .upsert(batch.map((b) => ({ seq: b.seq, payload: b.payload as unknown as Database["public"]["Tables"]["registry_address_stage"]["Insert"]["payload"] })));
    if (error) {
      failed += batch.length;
    } else {
      written += batch.length;
    }
  }
  await bumpRun(supabase, runId, written, failed);
  await supabase.from("import_runs").update({ bytes_processed: chunk.nextByte }).eq("id", runId);
  return chunk.nextByte >= fileSize;
}

async function processOrganisationsSlice(supabase: Db, runId: string): Promise<boolean> {
  const run = await readRunRow(supabase, runId);
  const url = run.storage_path!;
  const fileSize = Number(run.file_size ?? 0);
  const chunk = await readChunk(url, Number(run.bytes_processed ?? 0), fileSize);
  if (!chunk) return true;

  let failed = 0;
  const mapped: CompanyImportRow[] = [];
  const seqs = new Set<string>();
  for (const row of chunk.rows) {
    const company = mapOrganisationRow(row);
    if (company) {
      mapped.push(company);
      const seq = row["ADDRESS_SEQ_NO"]?.trim();
      if (seq) seqs.add(seq);
    } else {
      failed += 1;
    }
  }

  // Join addresses from the staging table (replaces the in-memory map the
  // browser uploader uses — too large to hold in one worker invocation).
  const addresses = new Map<string, AddressRecord>();
  const seqList = [...seqs];
  for (let i = 0; i < seqList.length; i += 500) {
    const batch = seqList.slice(i, i + 500);
    const { data } = await supabase
      .from("registry_address_stage")
      .select("seq, payload")
      .in("seq", batch);
    for (const row of data ?? []) {
      addresses.set(row.seq, row.payload as unknown as AddressRecord);
    }
  }
  for (const company of mapped) {
    const seq = (company as Record<string, unknown>)["__seq"] as string | undefined;
    void seq;
  }

  // mapOrganisationRow already dropped ADDRESS_SEQ_NO; re-attach via a second
  // pass over the raw rows so each company gets its staged address.
  const bySlug = new Map<string, Record<string, string>>();
  for (const row of chunk.rows) {
    const company = mapOrganisationRow(row);
    if (company) bySlug.set(company.slug, row);
  }
  for (const company of mapped) {
    const raw = bySlug.get(company.slug);
    const seq = raw?.["ADDRESS_SEQ_NO"]?.trim();
    const address = seq ? addresses.get(seq) : undefined;
    if (address) Object.assign(company, address);
  }

  for (let i = 0; i < mapped.length; i += COMPANY_UPSERT_BATCH) {
    const batch = mapped.slice(i, i + COMPANY_UPSERT_BATCH);
    try {
      await upsertCompanies(runId, batch);
    } catch (error) {
      failed += batch.length;
      console.error("registry-sync companies batch failed:", error);
    }
  }
  if (failed > 0) await bumpRun(supabase, runId, 0, failed);
  await supabase.from("import_runs").update({ bytes_processed: chunk.nextByte }).eq("id", runId);
  return chunk.nextByte >= fileSize;
}

async function processOfficialsSlice(supabase: Db, runId: string): Promise<boolean> {
  const run = await readRunRow(supabase, runId);

  if (run.stage === "truncate") {
    await truncateOfficials();
    await supabase.from("import_runs").update({ stage: "resetting_counts" }).eq("id", runId);
    return false;
  }

  if (run.stage === "resetting_counts") {
    const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(
      "reset_officials_counts_chunk",
      { batch_size: 5000 },
    );
    if (error) throw new Error(error.message);
    if (Number(data ?? 0) > 0) return false;
    await supabase
      .from("import_runs")
      .update({ stage: "processing", rows_processed: 0, rows_failed: 0, bytes_processed: 0 })
      .eq("id", runId);
    return false;
  }

  const url = run.storage_path!;
  const fileSize = Number(run.file_size ?? 0);
  const chunk = await readChunk(url, Number(run.bytes_processed ?? 0), fileSize);
  if (!chunk) return true;

  let parseFailed = 0;
  const mapped: OfficialImportRow[] = [];
  for (const row of chunk.rows) {
    const official = mapOfficialRow(row);
    if (official) mapped.push(official);
    else parseFailed += 1;
  }
  for (let i = 0; i < mapped.length; i += OFFICIALS_INSERT_BATCH) {
    await insertOfficials(runId, mapped.slice(i, i + OFFICIALS_INSERT_BATCH));
  }
  if (parseFailed > 0) await bumpRun(supabase, runId, 0, parseFailed);
  await supabase.from("import_runs").update({ bytes_processed: chunk.nextByte }).eq("id", runId);
  return chunk.nextByte >= fileSize;
}

// ---------------------------------------------------------------------------
// Job orchestration
// ---------------------------------------------------------------------------

const PHASE_ORDER: FileKey[] = ["addresses", "organisations", "officials"];

async function processPhaseSlice(supabase: Db, job: JobRow, phase: FileKey): Promise<boolean> {
  const runId = await ensureRun(supabase, job, phase);
  if (phase === "addresses") return processAddressesSlice(supabase, runId);
  if (phase === "organisations") return processOrganisationsSlice(supabase, runId);
  return processOfficialsSlice(supabase, runId);
}

function nextPhase(job: JobRow, current: FileKey): FileKey | null {
  const changed = ((job.files_changed as string[]) ?? []).filter((k): k is FileKey =>
    PHASE_ORDER.includes(k as FileKey),
  );
  const ordered = PHASE_ORDER.filter((k) => changed.includes(k));
  const index = ordered.indexOf(current);
  return index >= 0 && index + 1 < ordered.length ? ordered[index + 1] : null;
}

async function collectRunSummaries(supabase: Db, runIds: Record<string, string>) {
  const summaries: { file: string; rowsProcessed: number; rowsFailed: number; runId: string }[] = [];
  for (const [key, runId] of Object.entries(runIds)) {
    const run = await readRunRow(supabase, runId);
    summaries.push({
      file: key,
      runId,
      rowsProcessed: run.rows_processed ?? 0,
      rowsFailed: run.rows_failed ?? 0,
    });
  }
  return summaries;
}

async function sendReport(
  status: "completed" | "failed",
  job: JobRow,
  files: { file: string; rowsProcessed: number; rowsFailed: number; runId: string }[],
  error?: string | null,
) {
  const startedAt = job.started_at ?? new Date().toISOString();
  const finishedAt = new Date().toISOString();
  const durationMin = Math.max(
    1,
    Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 60000),
  );
  await sendTemplateEmail("registry-sync-report", OFFICE_EMAIL, {
    templateData: {
      status,
      files,
      error: error ?? null,
      startedAt,
      finishedAt,
      durationMin,
    },
    idempotencyKey: `registry-sync-${status}-${startedAt}`,
  });
}

async function finalizeJob(supabase: Db, job: JobRow) {
  const runIds = (job.run_ids ?? {}) as Record<string, string>;
  const officialsRan = Boolean(runIds["officials"]);

  for (const [key, runId] of Object.entries(runIds)) {
    await closeRun(runId, "completed", "automated monthly registry refresh");
    const file = FILES.find((f) => f.key === key)!;
    const head = await fetch(file.url, { method: "HEAD" });
    await supabase
      .from("registry_sync_state")
      .update({
        last_modified: head.headers.get("last-modified"),
        etag: head.headers.get("etag"),
        size: Number(head.headers.get("content-length") ?? 0) || null,
        last_run_id: runId,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("file_key", key);
  }

  if (officialsRan) {
    // Keep the cached per-company officials counts consistent with the reload.
    await runRefreshOfficialsCount();
  }

  await setJob(supabase, {
    status: "idle",
    phase: null,
    error: null,
    attempts: 0,
    finished_at: new Date().toISOString(),
  });

  const summaries = await collectRunSummaries(supabase, runIds);
  await sendReport("completed", job, summaries);
}

async function failJob(supabase: Db, job: JobRow, message: string) {
  const runIds = (job.run_ids ?? {}) as Record<string, string>;
  const phase = job.phase;
  if (phase && runIds[phase]) {
    try {
      await closeRun(runIds[phase], "failed", message);
    } catch (error) {
      console.error("registry-sync: could not close failed run", error);
    }
  }
  await setJob(supabase, { status: "failed", error: message.slice(0, 1000), finished_at: new Date().toISOString() });
  const summaries = await collectRunSummaries(supabase, runIds);
  await sendReport("failed", job, summaries, message);
}

async function detectionDue(supabase: Db): Promise<boolean> {
  const { data } = await supabase.from("registry_sync_state").select("last_checked_at");
  if (!data || data.length === 0) return true;
  const oldest = data.reduce<string | null>(
    (min, row) => (row.last_checked_at && (!min || row.last_checked_at < min) ? row.last_checked_at : min),
    null,
  );
  if (!oldest) return true;
  return Date.now() - new Date(oldest).getTime() > DETECT_INTERVAL_MS;
}

async function detectAndMaybeStart(supabase: Db) {
  const checkedAt = new Date().toISOString();
  const changed: FileKey[] = [];
  const headers: Record<string, { lastModified: string | null; etag: string | null; size: number | null }> = {};

  for (const file of FILES) {
    const response = await fetch(file.url, { method: "HEAD" });
    if (!response.ok) throw new Error(`Portal header check failed (${response.status}) for ${file.key}`);
    const lastModified = response.headers.get("last-modified");
    const etag = response.headers.get("etag");
    const size = Number(response.headers.get("content-length") ?? 0) || null;
    headers[file.key] = { lastModified, etag, size };

    const { data: state } = await supabase
      .from("registry_sync_state")
      .select("last_modified, size")
      .eq("file_key", file.key)
      .maybeSingle();

    const differs = !state || state.last_modified !== lastModified || Number(state.size ?? 0) !== Number(size ?? 0);
    if (differs) changed.push(file.key);

    await supabase
      .from("registry_sync_state")
      .update({ last_checked_at: checkedAt, updated_at: checkedAt })
      .eq("file_key", file.key);
  }

  if (changed.length === 0) {
    return { ok: true as const, status: "idle" as const, changed: false as const };
  }

  // Companies need the address staging table; if it is empty (first run) and
  // organisations are being imported, refresh addresses too.
  if (changed.includes("organisations") && !changed.includes("addresses")) {
    if ((await stagingCount(supabase)) === 0) changed.unshift("addresses");
  }

  const firstPhase = PHASE_ORDER.find((k) => changed.includes(k)) ?? null;

  await setJob(supabase, {
    status: "running",
    phase: firstPhase,
    files_changed: changed,
    run_ids: {},
    attempts: 0,
    error: null,
    started_at: checkedAt,
    finished_at: null,
  });

  return { ok: true as const, status: "started" as const, changed };
}

async function continueJob(supabase: Db, job: JobRow) {
  const deadline = Date.now() + TICK_BUDGET_MS;
  let current = job.phase as FileKey | null;

  while (Date.now() < deadline) {
    if (!current) {
      await finalizeJob(supabase, job);
      return { ok: true as const, status: "completed" as const };
    }
    const done = await processPhaseSlice(supabase, job, current);
    if (!done) continue;
    const runId = ((job.run_ids ?? {}) as Record<string, string>)[current];
    if (runId) await closeRun(runId, "completed", "automated monthly registry refresh");
    current = nextPhase(job, current);
    await setJob(supabase, { phase: current, attempts: 0 });
    job.phase = current;
  }

  return { ok: true as const, status: "running" as const, phase: current };
}

export async function runRegistrySyncTick(options?: { force?: boolean }) {
  const supabase = client();
  const { data: job, error } = await supabase
    .from("registry_sync_job")
    .select("*")
    .eq("id", true)
    .single();
  if (error || !job) throw new Error(error?.message ?? "registry_sync_job row missing");

  try {
    if (job.status === "running") {
      return await continueJob(supabase, job);
    }

    const due = options?.force || (await detectionDue(supabase));
    if (job.status === "failed" && !due) {
      return { ok: true as const, status: "failed" as const, note: "retrying at next weekly check", error: job.error };
    }
    if (!due) {
      return { ok: true as const, status: "idle" as const, note: "not due" };
    }
    return await detectAndMaybeStart(supabase);
  } catch (tickError) {
    const message = tickError instanceof Error ? tickError.message : String(tickError);
    console.error("registry-sync tick failed:", message);

    if (job.status === "running") {
      const attempts = (job.attempts ?? 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        await failJob(supabase, job, message);
        return { ok: false as const, status: "failed" as const, error: message };
      }
      await setJob(supabase, { attempts, error: message.slice(0, 1000) });
      return { ok: false as const, status: "retrying" as const, attempts, error: message };
    }
    throw tickError;
  }
}
