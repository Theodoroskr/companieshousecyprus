import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { iterateEntities, looksLikeFsf11, recordFingerprint, type SanctionsRecord } from "@/lib/sanctions/parse";

export const SANCTIONS_BUCKET = "sanctions-raw";
export const EU_SOURCE_CODE = "EU_FSF";

const MIN_FILE_BYTES = 1024 * 1024; // 1 MiB
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

function storagePathFor(hash: string, when: Date) {
  const y = when.getUTCFullYear();
  const m = String(when.getUTCMonth() + 1).padStart(2, "0");
  const d = String(when.getUTCDate()).padStart(2, "0");
  return `eu-fsf/${y}/${m}/${d}/${when.getTime()}-${hash.slice(0, 16)}.xml`;
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
    if (!source.is_active) {
      return { importId: null, status: "skipped", message: "Source is not active." };
    }

    const { data: created, error: createError } = await supabase
      .from("sanctions_imports")
      .insert({ source_id: source.id, status: "started" })
      .select("id")
      .single();
    if (createError || !created) throw new Error(createError?.message ?? "Could not create import run");
    importId = created.id;

    // 1. download -------------------------------------------------------
    await supabase.from("sanctions_imports").update({ status: "downloading" }).eq("id", importId);
    const response = await fetch(source.source_url, {
      headers: { Accept: "application/xml", "User-Agent": "CompaniesHouseCyprus-SanctionsImporter/1.0" },
    });
    if (response.status !== 200) {
      const detail = `Source returned HTTP ${response.status} ${response.statusText}`;
      await failImport(supabase, importId, detail, { stage: "download", status: response.status });
      return { importId, status: "failed", message: detail };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!/xml/i.test(contentType)) {
      const detail = `Unexpected content type from source: ${contentType || "(none)"}`;
      await failImport(supabase, importId, detail, { stage: "download", contentType });
      return { importId, status: "failed", message: detail };
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const retrievedAt = new Date();
    const lastModifiedHeader = response.headers.get("last-modified");
    const sourceLastModified = lastModifiedHeader ? new Date(lastModifiedHeader).toISOString() : null;
    const fileName =
      /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
      `${sourceCode.toLowerCase()}-${retrievedAt.toISOString().slice(0, 10)}.xml`;

    if (bytes.byteLength < MIN_FILE_BYTES) {
      const detail = `Source file is too small (${bytes.byteLength} bytes); refusing to import.`;
      await failImport(supabase, importId, detail, { stage: "validate", size: bytes.byteLength });
      return { importId, status: "failed", message: detail };
    }

    // 2. validate -------------------------------------------------------
    await supabase.from("sanctions_imports").update({ status: "validating" }).eq("id", importId);
    const xml = new TextDecoder("utf-8").decode(bytes);
    const structure = looksLikeFsf11(xml);
    if (!structure.ok) {
      const detail = `Source file failed validation: ${structure.reason}`;
      await failImport(supabase, importId, detail, { stage: "validate", reason: structure.reason });
      return { importId, status: "failed", message: detail };
    }

    const fileHash = await sha256Hex(bytes);

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
        })
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
    const storagePath = storagePathFor(fileHash, retrievedAt);
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
    let duplicates = 0;
    let batch: { import_id: string; source_record_id: string; record_hash: string; payload: SanctionsRecord }[] = [];

    const flush = async () => {
      if (batch.length === 0) return;
      const { error } = await supabase.from("sanctions_staging").insert(batch as never);
      if (error) throw new Error(`Staging insert failed: ${error.message}`);
      batch = [];
    };

    for (const record of iterateEntities(xml)) {
      if (seen.has(record.source_record_id)) {
        duplicates += 1;
        continue;
      }
      seen.add(record.source_record_id);
      parsed += 1;
      batch.push({
        import_id: importId,
        source_record_id: record.source_record_id,
        record_hash: shortHash(recordFingerprint(record)),
        payload: record,
      });
      if (batch.length >= STAGING_BATCH) await flush();
    }
    await flush();

    await supabase.from("sanctions_imports").update({ status: "staging" }).eq("id", importId);

    // 5. sanity checks before publishing ---------------------------------
    if (parsed === 0) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = "Parsed zero records from the source file; keeping the previous dataset.";
      await failImport(supabase, importId, detail, { stage: "sanity", parsed });
      return { importId, status: "failed", message: detail };
    }
    const previousCount = lastSuccess?.record_count ?? 0;
    if (previousCount > 0 && parsed < previousCount * (1 - MAX_RECORD_DROP)) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = `Record count fell from ${previousCount} to ${parsed} (more than 20%); keeping the previous dataset.`;
      await failImport(supabase, importId, detail, { stage: "sanity", parsed, previousCount });
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
    return {
      importId,
      status: "completed",
      message: "Import completed.",
      parsedCount: parsed,
      recordCount: result?.active_total ?? parsed,
      addedCount: result?.added ?? 0,
      modifiedCount: result?.modified ?? 0,
      removedCount: result?.removed ?? 0,
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

const WARN_STALE_MS = 24 * 60 * 60 * 1000;

export async function readSanctionsDashboard(sourceCode = EU_SOURCE_CODE) {
  const supabase = adminClient();
  const source = await getSource(supabase, sourceCode);

  const [{ data: imports }, { count: activeCount }] = await Promise.all([
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
      informationUrl: source.information_url,
      updateFrequency: source.update_frequency,
      isActive: source.is_active,
    },
    feedStatus,
    warnings,
    activeCount: activeCount ?? 0,
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
