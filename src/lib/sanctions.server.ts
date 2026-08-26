import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { iterateEntities, looksLikeFsf11, recordFingerprint, type SanctionsRecord } from "@/lib/sanctions/parse";
import { iterateUnRecords, looksLikeUnConsolidated } from "@/lib/sanctions/parse-un";
import { iterateUkDesignations, looksLikeUkSanctionsList } from "@/lib/sanctions/parse-uk";
import { OfacStreamParser } from "@/lib/sanctions/parse-ofac-stream";
import { StreamingSha256 } from "@/lib/sanctions/sha256-stream";
import { digestMismatchReport, extractOfficialDigest } from "@/lib/sanctions/digest";

export const SANCTIONS_BUCKET = "sanctions-raw";
export const EU_SOURCE_CODE = "EU_FSF";
export const UN_SOURCE_CODE = "UN_CONSOLIDATED";
export const UK_SOURCE_CODE = "UKSL";
export const OFAC_SOURCE_CODE = "OFAC_SDN";

type SourceAdapter = {
  validate: (xml: string) => { ok: boolean; reason?: string };
  iterate: (xml: string) => Generator<SanctionsRecord>;
  storagePrefix: string;
  minBytes: number;
  /** Extra pre-publication validation on the staged dataset. Returns an error message or null. */
  sanity?: (stats: { persons: number; entities: number; parsed: number }) => string | null;
};

// OFAC's 126 MB Advanced XML must never be buffered: the generic
// validate/iterate hooks would hold the whole document in memory, which
// exceeds the production worker limit. runSanctionsImport delegates OFAC to
// runOfacStreamingImport (chunked SAX-style parser) before the adapter hooks
// are reachable; these stubs hard-fail if that invariant is ever broken.
function ofacBufferedPathForbidden(): never {
  throw new Error(
    "OFAC must be imported via runOfacStreamingImport (streaming parser); the buffered path exceeds the worker memory limit.",
  );
}

const SOURCE_ADAPTERS: Record<string, SourceAdapter> = {
  [EU_SOURCE_CODE]: {
    validate: looksLikeFsf11,
    iterate: iterateEntities,
    storagePrefix: "eu-fsf",
    minBytes: 1024 * 1024,
  },
  [UN_SOURCE_CODE]: {
    validate: looksLikeUnConsolidated,
    iterate: iterateUnRecords,
    storagePrefix: "un-consolidated",
    minBytes: 100 * 1024,
    sanity: ({ persons, entities }) => {
      if (persons < 1) return "The staged UN dataset contains no individuals.";
      if (entities < 1) return "The staged UN dataset contains no entities.";
      return null;
    },
  },
  [UK_SOURCE_CODE]: {
    validate: looksLikeUkSanctionsList,
    iterate: iterateUkDesignations,
    storagePrefix: "uk-sanctions",
    minBytes: 500 * 1024,
    sanity: ({ persons, entities }) => {
      if (persons < 1) return "The staged UK dataset contains no individuals.";
      if (entities < 1) return "The staged UK dataset contains no entities.";
      return null;
    },
  },
  [OFAC_SOURCE_CODE]: {
    validate: ofacBufferedPathForbidden,
    iterate: ofacBufferedPathForbidden,
    storagePrefix: "ofac-sdn",
    // The Advanced SDN export is ~126 MB; refuse anything implausibly small.
    minBytes: 20 * 1024 * 1024,
    sanity: ({ persons, entities }) => {
      if (persons < 1) return "The staged OFAC dataset contains no individuals.";
      if (entities < 1) return "The staged OFAC dataset contains no entities.";
      return null;
    },
  },
};

function adapterFor(sourceCode: string): SourceAdapter {
  const adapter = SOURCE_ADAPTERS[sourceCode];
  if (!adapter) throw new Error(`No importer adapter for source ${sourceCode}`);
  return adapter;
}

const MAX_RECORD_DROP = 0.2; // 20%
const STAGING_BATCH = 400;

type AnyClient = ReturnType<typeof adminClient>;

function adminClient() {
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

/** Cheap, stable per-record hash used only for change detection. */
function shortHash(value: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < value.length; i += 1) {
    const c = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2246822519) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function storagePathFor(prefix: string, hash: string, when: Date) {
  const y = when.getUTCFullYear();
  const m = String(when.getUTCMonth() + 1).padStart(2, "0");
  const d = String(when.getUTCDate()).padStart(2, "0");
  return `${prefix}/${y}/${m}/${d}/${when.getTime()}-${hash.slice(0, 16)}.xml`;
}

/** Peak RSS in MB when running under Node (preview/dev); null in workerd. */
function nodeRssMb(): number | null {
  try {
    if (typeof process !== "undefined" && typeof process.memoryUsage === "function") {
      return Math.round(process.memoryUsage().rss / 1048576);
    }
  } catch {
    // not a Node-like runtime
  }
  return null;
}

async function getSource(supabase: AnyClient, sourceCode: string) {
  const { data, error } = await supabase
    .from("sanctions_sources")
    .select("*")
    .eq("source_code", sourceCode)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Unknown sanctions source ${sourceCode}`);
  return data;
}

async function failImport(supabase: AnyClient, importId: string, message: string, diagnostics?: unknown) {
  await supabase
    .from("sanctions_imports")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: message.slice(0, 2000),
      diagnostic_details: (diagnostics ?? null) as never,
    })
    .eq("id", importId);
}

export type ImportOutcome = {
  importId: string | null;
  status: "completed" | "unchanged" | "failed" | "skipped";
  message: string;
  recordCount?: number;
  parsedCount?: number;
  addedCount?: number;
  modifiedCount?: number;
  removedCount?: number;
  personCount?: number;
  entityCount?: number;
  shipCount?: number;
  aircraftCount?: number;
  walletCount?: number;
  failedRecordCount?: number;
  fileSizeBytes?: number;
  fileHash?: string;
  sourceLastModified?: string | null;
  storagePath?: string | null;
  durationMs?: number;
};

/**
 * Downloads, validates, stages and atomically publishes the EU sanctions list.
 * The previous live dataset is untouched unless publication succeeds.
 */
export async function runSanctionsImport(
  options: { sourceCode?: string; force?: boolean } = {},
): Promise<ImportOutcome> {
  const sourceCode = options.sourceCode ?? EU_SOURCE_CODE;
  // OFAC's 126 MB feed always goes through the low-memory streaming worker.
  if (sourceCode === OFAC_SOURCE_CODE) return runOfacStreamingImport(options.force ? { force: true } : {});
  const adapter = adapterFor(sourceCode);
  const supabase = adminClient();
  const startedAt = Date.now();

  const { data: locked, error: lockError } = await (supabase.rpc as never as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>)("sanctions_try_lock", {
    _source_code: sourceCode,
  });
  if (lockError) throw new Error(lockError.message);
  if (!locked) {
    return { importId: null, status: "skipped", message: "Another import for this source is already running." };
  }

  let importId: string | null = null;
  try {
    const source = await getSource(supabase, sourceCode);
    // Inactive sources are skipped by the scheduler; an admin may still force
    // a manual run (used for the initial connection test + first import).
    if (!source.is_active && !options.force) {
      return { importId: null, status: "skipped", message: "Source is not active." };
    }

    const { data: created, error: createError } = await supabase
      .from("sanctions_imports")
      .insert({ source_id: source.id, status: "started" })
      .select("id")
      .single();
    if (createError || !created) throw new Error(createError?.message ?? "Could not create import run");
    importId = created.id;

    // 1. download (follows redirects; e.g. the UN stable URL 302s to a
    // short-lived signed Azure Blob URL — we only record the final host in
    // diagnostics, never as the configured source) ---------------------------
    await supabase.from("sanctions_imports").update({ status: "downloading" }).eq("id", importId);
    const response = await fetch(source.source_url, {
      redirect: "follow",
      headers: { Accept: "application/xml", "User-Agent": "CompaniesHouseCyprus-SanctionsImporter/1.0" },
    });
    const finalHost = response.url ? new URL(response.url).host : null;
    if (response.status !== 200) {
      const detail = `Source returned HTTP ${response.status} ${response.statusText}`;
      await failImport(supabase, importId, detail, { stage: "download", status: response.status, finalHost });
      return { importId, status: "failed", message: detail };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const etagHeader = response.headers.get("etag");
    // Source-published integrity digest (Digest / Repr-Digest / checksum
    // headers), kept in history and enforced before publication.
    const officialDigest = extractOfficialDigest(response.headers);
    // Redirected/CDN destinations sometimes label XML as octet-stream; the
    // structural XML validation below is the real gate. Only fail early on an
    // obviously non-XML content type such as text/html.
    if (contentType && !/xml|octet-stream|text\/plain/i.test(contentType)) {
      const detail = `Unexpected content type from source: ${contentType}`;
      await failImport(supabase, importId, detail, { stage: "download", contentType, finalHost });
      return { importId, status: "failed", message: detail };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const retrievedAt = new Date();
    const lastModifiedHeader = response.headers.get("last-modified");
    const sourceLastModified = lastModifiedHeader ? new Date(lastModifiedHeader).toISOString() : null;
    const fileName =
      /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
      `${sourceCode.toLowerCase()}-${retrievedAt.toISOString().slice(0, 10)}.xml`;

    if (bytes.byteLength < adapter.minBytes) {
      const detail = `Source file is too small (${bytes.byteLength} bytes); refusing to import.`;
      await failImport(supabase, importId, detail, { stage: "validate", size: bytes.byteLength, finalHost });
      return { importId, status: "failed", message: detail };
    }

    // 2. validate -------------------------------------------------------
    await supabase.from("sanctions_imports").update({ status: "validating" }).eq("id", importId);
    const xml = new TextDecoder("utf-8").decode(bytes);
    const structure = adapter.validate(xml);
    if (!structure.ok) {
      const detail = `Source file failed validation: ${structure.reason}`;
      await failImport(supabase, importId, detail, { stage: "validate", reason: structure.reason, finalHost });
      return { importId, status: "failed", message: detail };
    }

    const fileHash = await sha256Hex(bytes);

    // Integrity gate: if the source published a SHA-256 digest and our
    // downloaded bytes do not match, fail loudly — never publish.
    const digestMismatch = digestMismatchReport(fileHash, officialDigest);
    if (digestMismatch) {
      await supabase
        .from("sanctions_imports")
        .update({
          official_digest_sha256: officialDigest!.sha256Hex,
          official_digest_header: `${officialDigest!.header}: ${officialDigest!.raw}`,
          digest_mismatch: true,
        } as never)
        .eq("id", importId);
      await failImport(supabase, importId, digestMismatch, {
        stage: "digest",
        expected: officialDigest!.sha256Hex,
        actual: fileHash,
        finalHost,
      });
      return { importId, status: "failed", message: digestMismatch };
    }

    const { data: lastSuccess } = await supabase
      .from("sanctions_imports")
      .select("id, file_hash_sha256, record_count, storage_path")
      .eq("source_id", source.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!options.force && lastSuccess?.file_hash_sha256 === fileHash) {
      await supabase
        .from("sanctions_imports")
        .update({
          status: "unchanged",
          retrieved_at: retrievedAt.toISOString(),
          source_last_modified: sourceLastModified,
          file_name: fileName,
          file_hash_sha256: fileHash,
          file_size_bytes: bytes.byteLength,
          storage_path: lastSuccess.storage_path,
          record_count: lastSuccess.record_count,
          completed_at: new Date().toISOString(),
          official_digest_sha256: officialDigest?.sha256Hex ?? null,
          official_digest_header: officialDigest ? `${officialDigest.header}: ${officialDigest.raw}` : null,
          digest_mismatch: false,
        } as never)
        .eq("id", importId);
      return {
        importId,
        status: "unchanged",
        message: "Source file is identical to the last successful import.",
        fileHash,
        fileSizeBytes: bytes.byteLength,
        sourceLastModified,
        recordCount: lastSuccess.record_count ?? 0,
        durationMs: Date.now() - startedAt,
      };
    }

    // 3. archive the raw file privately ---------------------------------
    const storagePath = storagePathFor(adapter.storagePrefix, fileHash, retrievedAt);
    const { error: uploadError } = await supabase.storage
      .from(SANCTIONS_BUCKET)
      .upload(storagePath, bytes, { contentType: "application/xml", upsert: true });
    if (uploadError) {
      const detail = `Could not archive the source file: ${uploadError.message}`;
      await failImport(supabase, importId, detail, { stage: "storage" });
      return { importId, status: "failed", message: detail };
    }

    await supabase
      .from("sanctions_imports")
      .update({
        status: "parsing",
        retrieved_at: retrievedAt.toISOString(),
        source_last_modified: sourceLastModified,
        file_name: fileName,
        file_hash_sha256: fileHash,
        file_size_bytes: bytes.byteLength,
        storage_path: storagePath,
      })
      .eq("id", importId);

    // 4. parse + stage ---------------------------------------------------
    const seen = new Set<string>();
    let parsed = 0;
    let persons = 0;
    let entities = 0;
    let ships = 0;
    let aircraft = 0;
    let wallets = 0;
    let duplicates = 0;
    let failedRecords = 0;
    let batch: { import_id: string; source_record_id: string; record_hash: string; payload: SanctionsRecord }[] = [];
    const parseStartedAt = Date.now();
    const rssBefore = nodeRssMb();

    const flush = async () => {
      if (batch.length === 0) return;
      const { error } = await supabase.from("sanctions_staging").insert(batch as never);
      if (error) throw new Error(`Staging insert failed: ${error.message}`);
      batch = [];
    };

    for (const record of adapter.iterate(xml)) {
      if (seen.has(record.source_record_id)) {
        duplicates += 1;
        continue;
      }
      seen.add(record.source_record_id);
      parsed += 1;
      if (record.entity_type === "person") persons += 1;
      else if (record.entity_type === "ship") ships += 1;
      else if (record.entity_type === "aircraft") aircraft += 1;
      else if (record.entity_type === "entity") entities += 1;
      if (record.identifiers.some((i) => i.identifier_type === "digital_currency_address")) wallets += 1;
      batch.push({
        import_id: importId,
        source_record_id: record.source_record_id,
        record_hash: shortHash(recordFingerprint(record)),
        payload: record,
      });
      if (batch.length >= STAGING_BATCH) await flush();
    }
    await flush();
    const parseDurationMs = Date.now() - parseStartedAt;
    const rssAfter = nodeRssMb();

    await supabase.from("sanctions_imports").update({ status: "staging" }).eq("id", importId);

    // 5. sanity checks before publishing ---------------------------------
    if (parsed === 0) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = "Parsed zero records from the source file; keeping the previous dataset.";
      await failImport(supabase, importId, detail, { stage: "sanity", parsed, finalHost });
      return { importId, status: "failed", message: detail };
    }
    const sanityError = adapter.sanity?.({ persons, entities, parsed }) ?? null;
    if (sanityError) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      await failImport(supabase, importId, `${sanityError} Keeping the previous dataset.`, {
        stage: "sanity",
        parsed,
        persons,
        entities,
        finalHost,
      });
      return { importId, status: "failed", message: sanityError };
    }
    const previousCount = lastSuccess?.record_count ?? 0;
    if (previousCount > 0 && parsed < previousCount * (1 - MAX_RECORD_DROP)) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = `Record count fell from ${previousCount} to ${parsed} (more than 20%); keeping the previous dataset.`;
      await failImport(supabase, importId, detail, { stage: "sanity", parsed, previousCount, finalHost });
      return { importId, status: "failed", message: detail };
    }

    // 6. atomic publication ----------------------------------------------
    const { data: published, error: publishError } = await (supabase.rpc as never as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: { added: number; modified: number; removed: number; reactivated: number; active_total: number }[] | null;
      error: { message: string } | null;
    }>)("sanctions_publish_import", { _import_id: importId });

    if (publishError) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = `Publication failed: ${publishError.message}`;
      await failImport(supabase, importId, detail, { stage: "publish" });
      return { importId, status: "failed", message: detail };
    }

    const result = Array.isArray(published) ? published[0] : published;
    await supabase
      .from("sanctions_imports")
      .update({
        diagnostic_details: {
          finalHost,
          contentType,
          etag: etagHeader,
          persons,
          entities,
          ships,
          aircraft,
          walletRecords: wallets,
          duplicatesIgnored: duplicates,
          failedRecords,
          parseDurationMs,
          rssMbBefore: rssBefore,
          rssMbAfter: rssAfter,
          parser:
            sourceCode === UN_SOURCE_CODE
              ? "un-consolidated"
              : sourceCode === UK_SOURCE_CODE
                ? "uk-sanctions-list"
                : sourceCode === OFAC_SOURCE_CODE
                  ? "ofac-advanced-v3"
                  : "eu-fsf-1.1",
        } as never,
      })
      .eq("id", importId);
    return {
      importId,
      status: "completed",
      message: "Import completed.",
      parsedCount: parsed,
      recordCount: result?.active_total ?? parsed,
      addedCount: result?.added ?? 0,
      modifiedCount: result?.modified ?? 0,
      removedCount: result?.removed ?? 0,
      personCount: persons,
      entityCount: entities,
      shipCount: ships,
      aircraftCount: aircraft,
      walletCount: wallets,
      failedRecordCount: failedRecords,
      fileSizeBytes: bytes.byteLength,
      fileHash,
      sourceLastModified,
      storagePath,
      durationMs: Date.now() - startedAt,
      ...(duplicates > 0 ? { message: `Import completed (${duplicates} duplicate source IDs ignored).` } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import failure";
    if (importId) {
      const supabaseRetry = adminClient();
      await supabaseRetry.from("sanctions_staging").delete().eq("import_id", importId);
      await failImport(supabaseRetry, importId, message, { stage: "exception" });
    }
    return { importId, status: "failed", message, durationMs: Date.now() - startedAt };
  } finally {
    await (supabase.rpc as never as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      "sanctions_unlock",
      { _source_code: sourceCode },
    );
  }
}

/**
 * Dedicated OFAC worker: downloads and parses the ~126 MB Advanced XML as a
 * stream, so peak memory stays within the standard function limits (the
 * in-memory path in runSanctionsImport peaks near 1 GB RSS for this source).
 *
 * Streams the response body chunk-by-chunk through an incremental SHA-256 and
 * the chunked OFAC parser, staging records in bounded batches. Reuses the
 * same lock, staging table, sanity rules and atomic publication RPC as every
 * other source, so the normalized schema and change history are identical.
 */
export async function runOfacStreamingImport(
  options: { force?: boolean } = {},
): Promise<ImportOutcome> {
  const sourceCode = OFAC_SOURCE_CODE;
  const adapter = adapterFor(sourceCode);
  const supabase = adminClient();
  const startedAt = Date.now();

  const { data: locked, error: lockError } = await (supabase.rpc as never as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>)("sanctions_try_lock", {
    _source_code: sourceCode,
  });
  if (lockError) throw new Error(lockError.message);
  if (!locked) {
    return { importId: null, status: "skipped", message: "Another import for this source is already running." };
  }

  let importId: string | null = null;
  try {
    const source = await getSource(supabase, sourceCode);
    if (!source.is_active && !options.force) {
      return { importId: null, status: "skipped", message: "Source is not active." };
    }

    const { data: created, error: createError } = await supabase
      .from("sanctions_imports")
      .insert({ source_id: source.id, status: "started" })
      .select("id")
      .single();
    if (createError || !created) throw new Error(createError?.message ?? "Could not create import run");
    importId = created.id;

    // 1. open the stream --------------------------------------------------
    await supabase.from("sanctions_imports").update({ status: "downloading" }).eq("id", importId);
    const response = await fetch(source.source_url, {
      redirect: "follow",
      headers: { Accept: "application/xml", "User-Agent": "CompaniesHouseCyprus-SanctionsImporter/1.0" },
    });
    const finalHost = response.url ? new URL(response.url).host : null;
    if (response.status !== 200) {
      const detail = `Source returned HTTP ${response.status} ${response.statusText}`;
      await failImport(supabase, importId, detail, { stage: "download", status: response.status, finalHost });
      return { importId, status: "failed", message: detail };
    }
    const contentType = response.headers.get("content-type") ?? "";
    const etagHeader = response.headers.get("etag");
    if (contentType && !/xml|octet-stream|text\/plain/i.test(contentType)) {
      const detail = `Unexpected content type from source: ${contentType}`;
      await failImport(supabase, importId, detail, { stage: "download", contentType, finalHost });
      return { importId, status: "failed", message: detail };
    }
    if (!response.body) {
      const detail = "Source response has no readable body stream.";
      await failImport(supabase, importId, detail, { stage: "download", finalHost });
      return { importId, status: "failed", message: detail };
    }
    const retrievedAt = new Date();
    const lastModifiedHeader = response.headers.get("last-modified");
    const sourceLastModified = lastModifiedHeader ? new Date(lastModifiedHeader).toISOString() : null;
    const fileName =
      /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
      `ofac-sdn-${retrievedAt.toISOString().slice(0, 10)}.xml`;

    // 2. stream: hash + parse + stage, chunk by chunk ----------------------
    await supabase.from("sanctions_imports").update({ status: "parsing" }).eq("id", importId);
    const hasher = new StreamingSha256();
    const parser = new OfacStreamParser();
    const decoder = new TextDecoder("utf-8");
    const parseStartedAt = Date.now();
    const rssBefore = nodeRssMb();

    let fileSizeBytes = 0;
    let parsed = 0;
    let persons = 0;
    let entities = 0;
    let ships = 0;
    let aircraft = 0;
    let wallets = 0;
    let batch: { import_id: string; source_record_id: string; record_hash: string; payload: SanctionsRecord }[] = [];
    const flush = async () => {
      if (batch.length === 0) return;
      const { error } = await supabase.from("sanctions_staging").insert(batch as never);
      if (error) throw new Error(`Staging insert failed: ${error.message}`);
      batch = [];
    };
    const stageRecord = async (record: SanctionsRecord) => {
      parsed += 1;
      if (record.entity_type === "person") persons += 1;
      else if (record.entity_type === "ship") ships += 1;
      else if (record.entity_type === "aircraft") aircraft += 1;
      else if (record.entity_type === "entity") entities += 1;
      if (record.identifiers.some((i) => i.identifier_type === "digital_currency_address")) wallets += 1;
      batch.push({
        import_id: importId!,
        source_record_id: record.source_record_id,
        record_hash: shortHash(recordFingerprint(record)),
        payload: record,
      });
      if (batch.length >= STAGING_BATCH) await flush();
    };

    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      fileSizeBytes += value.byteLength;
      hasher.update(value);
      for (const record of parser.feed(decoder.decode(value, { stream: true }))) {
        await stageRecord(record);
      }
    }
    const tail = parser.finish();
    for (const record of tail.records) await stageRecord(record);
    await flush();
    const parseDurationMs = Date.now() - parseStartedAt;
    const rssAfter = nodeRssMb();

    if (fileSizeBytes < adapter.minBytes) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = `Source file is too small (${fileSizeBytes} bytes); refusing to import.`;
      await failImport(supabase, importId, detail, { stage: "validate", size: fileSizeBytes, finalHost });
      return { importId, status: "failed", message: detail };
    }

    const fileHash = hasher.digestHex();

    const { data: lastSuccess } = await supabase
      .from("sanctions_imports")
      .select("id, file_hash_sha256, record_count, storage_path")
      .eq("source_id", source.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!options.force && lastSuccess?.file_hash_sha256 === fileHash) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      await supabase
        .from("sanctions_imports")
        .update({
          status: "unchanged",
          retrieved_at: retrievedAt.toISOString(),
          source_last_modified: sourceLastModified,
          file_name: fileName,
          file_hash_sha256: fileHash,
          file_size_bytes: fileSizeBytes,
          storage_path: lastSuccess.storage_path,
          record_count: lastSuccess.record_count,
          completed_at: new Date().toISOString(),
        })
        .eq("id", importId);
      return {
        importId,
        status: "unchanged",
        message: "Source file is identical to the last successful import.",
        fileHash,
        fileSizeBytes,
        sourceLastModified,
        recordCount: lastSuccess.record_count ?? 0,
        durationMs: Date.now() - startedAt,
      };
    }

    // 3. archive the raw file privately -----------------------------------
    // The bytes were streamed (never buffered), so re-fetch for the archive
    // upload; Storage handles the streamed request body on its side.
    let storagePath: string | null = null;
    try {
      const archiveResponse = await fetch(source.source_url, {
        redirect: "follow",
        headers: { Accept: "application/xml", "User-Agent": "CompaniesHouseCyprus-SanctionsImporter/1.0" },
      });
      if (archiveResponse.ok && archiveResponse.body) {
        storagePath = storagePathFor(adapter.storagePrefix, fileHash, retrievedAt);
        const { error: uploadError } = await supabase.storage
          .from(SANCTIONS_BUCKET)
          .upload(storagePath, archiveResponse.body as never, {
            contentType: "application/xml",
            upsert: true,
            duplex: "half",
          } as never);
        if (uploadError) {
          storagePath = null;
          console.warn("[ofac-worker] raw archive upload failed", uploadError.message);
        }
      }
    } catch (archiveError) {
      storagePath = null;
      console.warn("[ofac-worker] raw archive fetch failed", archiveError);
    }

    await supabase
      .from("sanctions_imports")
      .update({
        status: "staging",
        retrieved_at: retrievedAt.toISOString(),
        source_last_modified: sourceLastModified,
        file_name: fileName,
        file_hash_sha256: fileHash,
        file_size_bytes: fileSizeBytes,
        storage_path: storagePath,
      })
      .eq("id", importId);

    // 4. sanity checks before publishing -----------------------------------
    if (parsed === 0) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = "Parsed zero records from the source file; keeping the previous dataset.";
      await failImport(supabase, importId, detail, { stage: "sanity", parsed, finalHost });
      return { importId, status: "failed", message: detail };
    }
    const sanityError = adapter.sanity?.({ persons, entities, parsed }) ?? null;
    if (sanityError) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      await failImport(supabase, importId, `${sanityError} Keeping the previous dataset.`, {
        stage: "sanity",
        parsed,
        persons,
        entities,
        finalHost,
      });
      return { importId, status: "failed", message: sanityError };
    }
    const previousCount = lastSuccess?.record_count ?? 0;
    if (previousCount > 0 && parsed < previousCount * (1 - MAX_RECORD_DROP)) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = `Record count fell from ${previousCount} to ${parsed} (more than 20%); keeping the previous dataset.`;
      await failImport(supabase, importId, detail, { stage: "sanity", parsed, previousCount, finalHost });
      return { importId, status: "failed", message: detail };
    }

    // 5. atomic publication -------------------------------------------------
    const { data: published, error: publishError } = await (supabase.rpc as never as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: { added: number; modified: number; removed: number; reactivated: number; active_total: number }[] | null;
      error: { message: string } | null;
    }>)("sanctions_publish_import", { _import_id: importId });

    if (publishError) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = `Publication failed: ${publishError.message}`;
      await failImport(supabase, importId, detail, { stage: "publish" });
      return { importId, status: "failed", message: detail };
    }

    const result = Array.isArray(published) ? published[0] : published;
    await supabase
      .from("sanctions_imports")
      .update({
        diagnostic_details: {
          finalHost,
          contentType,
          etag: etagHeader,
          persons,
          entities,
          ships,
          aircraft,
          walletRecords: wallets,
          duplicatesIgnored: tail.report.duplicateEntryIds,
          skippedNoIdentity: tail.report.skippedNoIdentity,
          totalParties: tail.report.totalParties,
          parseDurationMs,
          rssMbBefore: rssBefore,
          rssMbAfter: rssAfter,
          parser: "ofac-advanced-v3-stream",
          rawArchived: storagePath !== null,
        } as never,
      })
      .eq("id", importId);
    return {
      importId,
      status: "completed",
      message: "Import completed.",
      parsedCount: parsed,
      recordCount: result?.active_total ?? parsed,
      addedCount: result?.added ?? 0,
      modifiedCount: result?.modified ?? 0,
      removedCount: result?.removed ?? 0,
      personCount: persons,
      entityCount: entities,
      shipCount: ships,
      aircraftCount: aircraft,
      walletCount: wallets,
      failedRecordCount: 0,
      fileSizeBytes,
      fileHash,
      sourceLastModified,
      storagePath,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected import failure";
    if (importId) {
      const supabaseRetry = adminClient();
      await supabaseRetry.from("sanctions_staging").delete().eq("import_id", importId);
      await failImport(supabaseRetry, importId, message, { stage: "exception" });
    }
    return { importId, status: "failed", message, durationMs: Date.now() - startedAt };
  } finally {
    await (supabase.rpc as never as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      "sanctions_unlock",
      { _source_code: sourceCode },
    );
  }
}

const WARN_STALE_MS = 24 * 60 * 60 * 1000;

export async function readSanctionsDashboard(sourceCode = EU_SOURCE_CODE) {
  const supabase = adminClient();
  const source = await getSource(supabase, sourceCode);

  const [
    { data: imports },
    { count: activeCount },
    { count: personCount },
    { count: entityCount },
    { count: shipCount },
    { count: aircraftCount },
    { count: walletCount },
    { count: aliasCount },
    { count: identifierCount },
    { count: addressCount },
  ] = await Promise.all([
    supabase
      .from("sanctions_imports")
      .select(
        "id, status, started_at, completed_at, source_last_modified, retrieved_at, file_name, file_hash_sha256, file_size_bytes, storage_path, record_count, added_count, modified_count, removed_count, error_message, diagnostic_details",
      )
      .eq("source_id", source.id)
      .order("started_at", { ascending: false })
      .limit(25),
    supabase
      .from("sanctions_entries")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id)
      .eq("is_active", true),
    supabase
      .from("sanctions_entries")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id)
      .eq("is_active", true)
      .eq("entity_type", "person"),
    supabase
      .from("sanctions_entries")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id)
      .eq("is_active", true)
      .eq("entity_type", "entity"),
    supabase
      .from("sanctions_entries")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id)
      .eq("is_active", true)
      .eq("entity_type", "ship"),
    supabase
      .from("sanctions_entries")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id)
      .eq("is_active", true)
      .eq("entity_type", "aircraft"),
    supabase
      .from("sanctions_entries")
      .select("id", { count: "exact", head: true })
      .eq("source_id", source.id)
      .eq("is_active", true)
      .contains("raw_record", { raw: { wallets: [{}] } }),
    supabase
      .from("sanctions_aliases")
      .select("sanctions_entries!inner(source_id)", { count: "exact", head: true })
      .eq("sanctions_entries.source_id", source.id)
      .eq("sanctions_entries.is_active", true),
    supabase
      .from("sanctions_identifiers")
      .select("sanctions_entries!inner(source_id)", { count: "exact", head: true })
      .eq("sanctions_entries.source_id", source.id)
      .eq("sanctions_entries.is_active", true),
    supabase
      .from("sanctions_addresses")
      .select("sanctions_entries!inner(source_id)", { count: "exact", head: true })
      .eq("sanctions_entries.source_id", source.id)
      .eq("sanctions_entries.is_active", true),
  ]);

  const history = imports ?? [];
  const lastAttempt = history[0] ?? null;
  const lastSuccess = history.find((i) => i.status === "completed") ?? null;
  const lastSettled = history.find((i) => i.status === "completed" || i.status === "unchanged") ?? null;

  const warnings: string[] = [];
  const settledAt = lastSettled?.completed_at ?? null;
  if (!settledAt || Date.now() - new Date(settledAt).getTime() > WARN_STALE_MS) {
    warnings.push("No successful update in the last 24 hours.");
  }
  const recentTwo = history.slice(0, 2);
  if (recentTwo.length === 2 && recentTwo.every((i) => i.status === "failed")) {
    warnings.push("The last two update attempts failed.");
  }
  const previousSuccess = history.filter((i) => i.status === "completed")[1] ?? null;
  if (lastSuccess?.record_count && previousSuccess?.record_count) {
    const delta = Math.abs(lastSuccess.record_count - previousSuccess.record_count) / previousSuccess.record_count;
    if (delta > MAX_RECORD_DROP) {
      warnings.push(
        `Record count changed by ${(delta * 100).toFixed(1)}% between the last two successful updates.`,
      );
    }
  }
  if (lastAttempt?.status === "failed" && /validation|content type|XML/i.test(lastAttempt.error_message ?? "")) {
    warnings.push("The source file could not be validated.");
  }

  const feedStatus: "healthy" | "warning" | "failed" =
    lastAttempt?.status === "failed" && recentTwo.every((i) => i.status === "failed")
      ? "failed"
      : warnings.length > 0
        ? "warning"
        : "healthy";

  const durationMs =
    lastSettled?.completed_at && lastSettled.started_at
      ? new Date(lastSettled.completed_at).getTime() - new Date(lastSettled.started_at).getTime()
      : null;

  // The scheduler runs every four hours on the hour.
  const now = new Date();
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  next.setUTCHours(now.getUTCHours() + (4 - (now.getUTCHours() % 4)));

  return {
    source: {
      code: source.source_code,
      name: source.source_name,
      authority: source.authority,
      jurisdiction: source.jurisdiction,
      format: `${source.format_name} ${source.format_version}`,
      sourceUrl: source.source_url,
      informationUrl: source.information_url,
      updateFrequency: source.update_frequency,
      isActive: source.is_active,
      lastConnectionTestAt: (source as Record<string, unknown>)["last_connection_test_at"] as string | null,
      lastConnectionTestOk: (source as Record<string, unknown>)["last_connection_test_ok"] as boolean | null,
    },
    feedStatus,
    warnings,
    activeCount: activeCount ?? 0,
    personCount: personCount ?? 0,
    entityCount: entityCount ?? 0,
    shipCount: shipCount ?? 0,
    aircraftCount: aircraftCount ?? 0,
    walletCount: walletCount ?? 0,
    aliasCount: aliasCount ?? 0,
    identifierCount: identifierCount ?? 0,
    addressCount: addressCount ?? 0,
    lastAttempt,
    lastSuccess,
    lastSettled,
    durationMs,
    nextScheduledAt: next.toISOString(),
    history,
  };
}

export async function readSanctionsChanges(importId: string, limit = 200) {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("sanctions_import_changes")
    .select("id, source_record_id, change_type, previous_record, new_record, detected_at")
    .eq("import_id", importId)
    .order("detected_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    sourceRecordId: row.source_record_id,
    changeType: row.change_type,
    // "removed from source" — the EU feed does not state whether a record was
    // formally delisted, so we never claim that.
    label:
      row.change_type === "removed"
        ? "Removed from source"
        : row.change_type.charAt(0).toUpperCase() + row.change_type.slice(1),
    previousName: (row.previous_record as { primary_name?: string } | null)?.primary_name ?? null,
    newName: (row.new_record as { primary_name?: string } | null)?.primary_name ?? null,
    detectedAt: row.detected_at,
  }));
}

export async function createRawFileDownloadUrl(storagePath: string) {
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(SANCTIONS_BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not create download link");
  return { url: data.signedUrl };
}

/** Every configured sanctions source (admin source switcher). */
export async function listSanctionsSources() {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("sanctions_sources")
    .select("source_code, source_name, authority, jurisdiction, is_active, source_url, information_url")
    .order("source_code");
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Active source codes for the scheduler (cron runs only active sources). */
export async function listActiveSourceCodes(): Promise<string[]> {
  const supabase = adminClient();
  const { data, error } = await supabase.from("sanctions_sources").select("source_code").eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.source_code);
}

/**
 * Connection test: GET the stable source URL, follow redirects and verify the
 * destination responds with XML-ish content. Records the outcome on the
 * source row without touching any dataset.
 */
export async function testSanctionsConnection(sourceCode: string) {
  const supabase = adminClient();
  const source = await getSource(supabase, sourceCode);
  const startedAt = Date.now();
  let ok = false;
  let detail: string;
  let status: number | null = null;
  let contentType: string | null = null;
  let finalHost: string | null = null;

  try {
    const response = await fetch(source.source_url, {
      redirect: "follow",
      headers: { Accept: "application/xml", "User-Agent": "CompaniesHouseCyprus-SanctionsImporter/1.0" },
    });
    status = response.status;
    finalHost = response.url ? new URL(response.url).host : null;
    contentType = response.headers.get("content-type");
    const sample = (await response.text()).slice(0, 4096);
    if (status !== 200) {
      detail = `HTTP ${status} ${response.statusText}`;
    } else if (/^\s*</.test(sample) && !/^\s*<(!DOCTYPE\s+html|html)\b/i.test(sample)) {
      ok = true;
      detail = `OK — XML response from ${finalHost ?? "source"} (${Date.now() - startedAt} ms)`;
    } else {
      detail = "Response is not XML (possible HTML error page)";
    }
  } catch (error) {
    detail = error instanceof Error ? error.message : "Connection failed";
  }

  await supabase
    .from("sanctions_sources")
    .update({
      last_connection_test_at: new Date().toISOString(),
      last_connection_test_ok: ok,
    } as never)
    .eq("id", source.id);

  return { ok, detail, status, contentType, finalHost, durationMs: Date.now() - startedAt };
}

/** Activate or pause scheduled imports for a source (super-admin only). */
export async function setSanctionsSourceActive(sourceCode: string, active: boolean) {
  const supabase = adminClient();
  const source = await getSource(supabase, sourceCode);
  const { error } = await supabase.from("sanctions_sources").update({ is_active: active } as never).eq("id", source.id);
  if (error) throw new Error(error.message);
  return { ok: true, isActive: active };
}

/** Fetch one stored entry (raw JSONB record) for admin inspection. */
export async function readSanctionsEntryRaw(sourceCode: string, sourceRecordId: string) {
  const supabase = adminClient();
  const source = await getSource(supabase, sourceCode);
  const { data, error } = await supabase
    .from("sanctions_entries")
    .select("source_record_id, entity_type, primary_name, sanctions_programme, is_active, updated_at, raw_record")
    .eq("source_id", source.id)
    .eq("source_record_id", sourceRecordId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No stored record ${sourceRecordId} for ${sourceCode}`);
  return data;
}
