import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { iterateEntities, looksLikeFsf11, recordFingerprint, type SanctionsRecord } from "@/lib/sanctions/parse";
import { iterateUnRecords, looksLikeUnConsolidated } from "@/lib/sanctions/parse-un";
import { iterateUkDesignations, looksLikeUkSanctionsList } from "@/lib/sanctions/parse-uk";
import { OfacStreamParser } from "@/lib/sanctions/parse-ofac-stream";
import {
  buildOfacRecord,
  createAssemblyStats,
  parseIdRegDocumentBlock,
  parseLocationBlock,
  parseParty,
  type IdDoc,
  type LocationInfo,
  type Party,
} from "@/lib/sanctions/parse-ofac";
import { consumeOfacChunk, finishOfacCheckpoint, type OfacCheckpoint } from "@/lib/sanctions/ofac-checkpoint";
import { StreamingSha256 } from "@/lib/sanctions/sha256-stream";
import { digestMismatchReport, extractOfficialDigest } from "@/lib/sanctions/digest";

export const SANCTIONS_BUCKET = "sanctions-raw";
export const EU_SOURCE_CODE = "EU_FSF";
export const UN_SOURCE_CODE = "UN_CONSOLIDATED";
export const UK_SOURCE_CODE = "UKSL";
export const OFAC_SOURCE_CODE = "OFAC_SDN";

const SOURCE_FETCH_HEADERS = {
  Accept: "application/xml",
  "User-Agent": "CompaniesHouseCyprus-SanctionsImporter/1.0",
} as const;

/**
 * Mirrors used when the primary host is unreachable. OFAC sits behind a CDN
 * that intermittently fails the edge-to-origin TLS handshake (HTTP 525) — the
 * legacy Treasury download path serves the identical Advanced XML file.
 */
const SOURCE_FALLBACK_URLS: Record<string, string[]> = {
  // The PublicationPreview export intermittently answers 200 with an empty
  // body; the download endpoints redirect to the signed S3 copy of the same
  // Advanced XML file and are used as mirrors.
  [OFAC_SOURCE_CODE]: [
    "https://sanctionslistservice.ofac.treas.gov/api/download/sdn_advanced.xml",
    "https://www.treasury.gov/ofac/downloads/sanctions/1.0/sdn_advanced.xml",
    "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/ADVANCED_XML",
  ],
};

/** Transient edge/CDN failures worth retrying (includes Cloudflare 52x). */
function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** 200 responses that carry no payload at all (seen on OFAC's preview export). */
function emptyBody(response: Response): boolean {
  const length = response.headers.get("content-length");
  return length !== null && Number(length) === 0;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Downloads a sanctions source, retrying transient network/CDN failures with
 * exponential backoff before falling back to any configured mirror. Returns
 * the successful response plus the attempt log for import diagnostics.
 */
export async function fetchSanctionsSource(
  sourceCode: string,
  sourceUrl: string,
  options: { attemptsPerUrl?: number } = {},
): Promise<{ response: Response | null; urlUsed: string | null; attempts: Array<{ url: string; outcome: string }> }> {
  const attemptsPerUrl = options.attemptsPerUrl ?? 3;
  const urls = [sourceUrl, ...(SOURCE_FALLBACK_URLS[sourceCode] ?? []).filter((u) => u !== sourceUrl)];
  const attempts: Array<{ url: string; outcome: string }> = [];

  for (const url of urls) {
    for (let attempt = 1; attempt <= attemptsPerUrl; attempt += 1) {
      try {
        const response = await fetch(url, { redirect: "follow", headers: { ...SOURCE_FETCH_HEADERS } });
        if (response.status === 200 && emptyBody(response)) {
          // Some OFAC endpoints answer 200 with a zero-length body — treat it
          // as a failed attempt so the next mirror is tried.
          attempts.push({ url, outcome: "HTTP 200 with empty body (retrying)" });
          await response.body?.cancel().catch(() => undefined);
        } else if (response.status === 200 || !isTransientStatus(response.status)) {
          attempts.push({ url, outcome: `HTTP ${response.status}` });
          return { response, urlUsed: url, attempts };
        }
        attempts.push({ url, outcome: `HTTP ${response.status} (transient, retrying)` });
        await response.body?.cancel().catch(() => undefined);
      } catch (error) {
        attempts.push({ url, outcome: error instanceof Error ? error.message : "network error" });
      }
      if (attempt < attemptsPerUrl) await sleep(1000 * 2 ** (attempt - 1));
    }
  }
  return { response: null, urlUsed: null, attempts };
}

export type ResumeEvent = { offset: number; outcome: string };

/**
 * Wraps a download body in a stream that survives mid-transfer interruptions:
 * when the connection drops (or the body ends short of Content-Length) it
 * re-requests the *remaining* bytes with a `Range: bytes=<received>-` header
 * instead of restarting the whole file. `If-Range` (ETag or Last-Modified)
 * guarantees the server only resumes when the file has not changed; anything
 * other than a 206 aborts the download so we never splice two versions.
 */
export function createResumableBody(
  response: Response,
  requestUrl: string,
  options: { maxResumes?: number } = {},
): {
  stream: ReadableStream<Uint8Array>;
  resumeLog: ResumeEvent[];
  totalBytes: number | null;
  receivedBytes: () => number;
} {
  const maxResumes = options.maxResumes ?? 5;
  const resumeLog: ResumeEvent[] = [];
  // Resume against the final (post-redirect) URL — signed CDN/S3 copies keep
  // working, while the configured URL would 302 to a fresh object.
  const resumeUrl = response.url || requestUrl;
  const lengthHeader = response.headers.get("content-length");
  const totalBytes = lengthHeader !== null && Number.isFinite(Number(lengthHeader)) ? Number(lengthHeader) : null;
  const supportsRange = /bytes/i.test(response.headers.get("accept-ranges") ?? "") || totalBytes !== null;
  const etag = response.headers.get("etag");
  const lastModified = response.headers.get("last-modified");

  let reader = response.body?.getReader() ?? null;
  let received = 0;
  let resumes = 0;

  async function resume(reason: string): Promise<boolean> {
    if (!supportsRange || received === 0 || resumes >= maxResumes) return false;
    resumes += 1;
    await sleep(1000 * 2 ** (resumes - 1));
    const headers: Record<string, string> = { ...SOURCE_FETCH_HEADERS, Range: `bytes=${received}-` };
    const validator = etag ?? lastModified;
    if (validator) headers["If-Range"] = validator;
    try {
      const next = await fetch(resumeUrl, { redirect: "follow", headers });
      if (next.status !== 206 || !next.body) {
        await next.body?.cancel().catch(() => undefined);
        resumeLog.push({ offset: received, outcome: `resume rejected: HTTP ${next.status} (${reason})` });
        return false;
      }
      reader = next.body.getReader();
      resumeLog.push({ offset: received, outcome: `resumed from byte ${received} after ${reason}` });
      return true;
    } catch (error) {
      resumeLog.push({ offset: received, outcome: error instanceof Error ? error.message : "resume failed" });
      return false;
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        if (!reader) {
          controller.error(new Error("Source response has no readable body stream."));
          return;
        }
        try {
          const { done, value } = await reader.read();
          if (done) {
            if (totalBytes !== null && received < totalBytes) {
              const reason = `truncated at ${received}/${totalBytes} bytes`;
              if (await resume(reason)) continue;
              controller.error(new Error(`Download ${reason}; could not resume.`));
              return;
            }
            controller.close();
            return;
          }
          received += value.byteLength;
          controller.enqueue(value);
          return;
        } catch (error) {
          const reason = error instanceof Error ? error.message : "network error";
          if (await resume(reason)) continue;
          controller.error(error);
          return;
        }
      }
    },
    cancel(reason) {
      reader?.cancel(reason).catch(() => undefined);
    },
  });

  return { stream, resumeLog, totalBytes, receivedBytes: () => received };
}

/** Reads a whole resumable stream into memory (buffered import paths only). */
export async function collectStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

type RelayDownload = {
  jobId: string;
  chunkCount: number;
  totalBytes: number;
  readyAt: string | null;
  stream: ReadableStream<Uint8Array>;
};

/**
 * Reads a relayed source file out of the database.
 *
 * The hosting network cannot complete a TLS handshake with the Treasury
 * servers (every direct request answers HTTP 525), while the database can.
 * `public.sanctions_relay_tick()` pulls the file in ranged pieces into
 * `sanctions_relay_chunks`; this opens the newest completed transfer as a
 * stream so the importer pipeline (hash → parse → stage) is unchanged.
 */
export async function openRelayDownload(
  supabase: ReturnType<typeof adminClient>,
  sourceCode: string,
): Promise<RelayDownload | null> {
  const { data: job } = await supabase
    .from("sanctions_relay_jobs")
    .select("id, chunk_count, total_bytes, ready_at")
    .eq("source_code", sourceCode)
    .eq("status", "ready")
    .order("ready_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job) return null;

  const jobId = job.id as string;
  const chunkCount = (job.chunk_count as number) ?? 0;
  if (chunkCount === 0) return null;

  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index >= chunkCount) {
        controller.close();
        return;
      }
      const { data, error } = await supabase
        .from("sanctions_relay_chunks")
        .select("body")
        .eq("job_id", jobId)
        .eq("chunk_index", index)
        .maybeSingle();
      if (error) {
        controller.error(new Error(`Relay chunk ${index} read failed: ${error.message}`));
        return;
      }
      if (!data) {
        controller.error(new Error(`Relay chunk ${index} is missing`));
        return;
      }
      index += 1;
      controller.enqueue(encoder.encode(data.body as string));
    },
  });

  return {
    jobId,
    chunkCount,
    totalBytes: (job.total_bytes as number) ?? 0,
    readyAt: (job.ready_at as string) ?? null,
    stream,
  };
}

/** Marks a relayed file as consumed so the next transfer can start. */
async function markRelayConsumed(supabase: ReturnType<typeof adminClient>, jobId: string): Promise<void> {
  await supabase
    .from("sanctions_relay_jobs")
    .update({ status: "consumed", consumed_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
    .eq("id", jobId);
  await supabase.from("sanctions_relay_chunks").delete().eq("job_id", jobId);
}



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

type OfacSliceStatus = "waiting_for_relay" | "processing" | "ready_to_publish" | "completed" | "failed" | "skipped";
type OfacSliceOutcome = { status: OfacSliceStatus; message: string; importId?: string | null; nextChunk?: number; staged?: number };

function mapFromRows(rows: Array<{ set_name: string; ref_id: string; label: string }>, name: string): Map<string, string> {
  return new Map(rows.filter((row) => row.set_name === name).map((row) => [row.ref_id, row.label]));
}

async function loadOfacRefs(supabase: AnyClient, jobId: string) {
  const { data, error } = await supabase.from("ofac_reference_values").select("set_name, ref_id, label").eq("job_id", jobId);
  if (error) throw new Error(`OFAC reference lookup failed: ${error.message}`);
  const rows = (data ?? []) as Array<{ set_name: string; ref_id: string; label: string }>;
  return {
    aliasTypes: mapFromRows(rows, "AliasTypeValues"),
    featureTypes: mapFromRows(rows, "FeatureTypeValues"),
    detailRefs: mapFromRows(rows, "DetailReferenceValues"),
    docTypes: mapFromRows(rows, "IDRegDocTypeValues"),
    countries: mapFromRows(rows, "CountryValues"),
    legalBases: mapFromRows(rows, "LegalBasisValues"),
    locPartTypes: mapFromRows(rows, "LocPartTypeValues"),
  };
}

async function persistOfacBlocks(supabase: AnyClient, jobId: string, blocksFound: ReturnType<typeof consumeOfacChunk>["blocks"]): Promise<void> {
  const refs = await loadOfacRefs(supabase, jobId);
  const locations: unknown[] = [];
  const documents: unknown[] = [];
  const parties: unknown[] = [];
  const relationships: unknown[] = [];
  const entries: unknown[] = [];
  const upsertBatches = async (table: "ofac_locations" | "ofac_id_documents" | "ofac_parties" | "ofac_relationships" | "ofac_entries", rows: unknown[], onConflict: string) => {
    for (let index = 0; index < rows.length; index += 300) {
      const { error } = await supabase.from(table).upsert(rows.slice(index, index + 300) as never, { onConflict });
      if (error) throw new Error(`OFAC ${table} checkpoint failed: ${error.message}`);
    }
  };
  for (const block of blocksFound) {
    if (block.kind === "reference") {
      if (block.values.length > 0) {
        const { error } = await supabase.from("ofac_reference_values").upsert(
          block.values.map(([refId, label]) => ({ job_id: jobId, set_name: block.setName, ref_id: refId, label })),
          { onConflict: "job_id,set_name,ref_id" },
        );
        if (error) throw new Error(`OFAC reference checkpoint failed: ${error.message}`);
      }
      for (const [key, value] of block.values) {
        const target = block.setName === "AliasTypeValues" ? refs.aliasTypes
          : block.setName === "FeatureTypeValues" ? refs.featureTypes
          : block.setName === "DetailReferenceValues" ? refs.detailRefs
          : block.setName === "IDRegDocTypeValues" ? refs.docTypes
          : block.setName === "CountryValues" ? refs.countries
          : block.setName === "LegalBasisValues" ? refs.legalBases
          : block.setName === "LocPartTypeValues" ? refs.locPartTypes : null;
        target?.set(key, value);
      }
      continue;
    }
    if (block.section === "Locations") {
      const parsed = parseLocationBlock(block, refs.locPartTypes, refs.countries);
      if (parsed) locations.push({ job_id: jobId, location_id: parsed.id, payload: parsed.info });
    } else if (block.section === "IDRegDocuments") {
      const parsed = parseIdRegDocumentBlock(block, refs.docTypes, refs.countries);
      const documentId = block.attrs["ID"];
      if (parsed?.identityId && documentId) documents.push({ job_id: jobId, document_id: documentId, identity_id: parsed.identityId, payload: parsed });
    } else if (block.section === "DistinctParties") {
      const parsed = parseParty(block);
      if (parsed) parties.push({ job_id: jobId, profile_id: parsed.profileId, payload: parsed });
    } else if (block.section === "ProfileRelationships") {
      const relationshipId = block.attrs["ID"];
      const entryId = block.attrs["SanctionsEntryID"];
      const related = block.attrs["To-ProfileID"];
      if (relationshipId && entryId && related) relationships.push({ job_id: jobId, relationship_id: relationshipId, entry_id: entryId, related_profile_id: related, former: block.attrs["Former"] === "true" });
    } else if (block.section === "SanctionsEntries") {
      const entryId = block.attrs["ID"];
      if (entryId) entries.push({ job_id: jobId, entry_id: entryId, profile_id: block.attrs["ProfileID"] ?? null, payload: block });
    }
  }
  await upsertBatches("ofac_locations", locations, "job_id,location_id");
  await upsertBatches("ofac_id_documents", documents, "job_id,document_id");
  await upsertBatches("ofac_parties", parties, "job_id,profile_id");
  await upsertBatches("ofac_relationships", relationships, "job_id,relationship_id");
  await upsertBatches("ofac_entries", entries, "job_id,entry_id");
}

async function assembleOfacBatch(supabase: AnyClient, job: { id: string; import_id: string; staged_entries: number }): Promise<number> {
  const { data: entryRows, error: entryError } = await supabase.from("ofac_entries").select("entry_id, profile_id, payload").eq("job_id", job.id).is("processed_at", null).order("entry_id").limit(150);
  if (entryError) throw new Error(`OFAC entry batch failed: ${entryError.message}`);
  if (!entryRows || entryRows.length === 0) return 0;
  const entries = entryRows as Array<{ entry_id: string; profile_id: string | null; payload: { attrs: Record<string, string>; body: string } }>;
  const entryIds = entries.map((row) => row.entry_id);
  const profileIds = entries.map((row) => row.profile_id).filter((value): value is string => Boolean(value));
  const [{ data: relationshipRows }, { data: primaryPartyRows }] = await Promise.all([
    supabase.from("ofac_relationships").select("entry_id, related_profile_id, former").eq("job_id", job.id).in("entry_id", entryIds),
    supabase.from("ofac_parties").select("profile_id, payload").eq("job_id", job.id).in("profile_id", profileIds.length ? profileIds : ["__none__"]),
  ]);
  const relationships = (relationshipRows ?? []) as Array<{ entry_id: string; related_profile_id: string; former: boolean }>;
  const relatedIds = relationships.map((row) => row.related_profile_id);
  const { data: relatedPartyRows } = await supabase.from("ofac_parties").select("profile_id, payload").eq("job_id", job.id).in("profile_id", relatedIds.length ? relatedIds : ["__none__"]);
  const parties = new Map<string, Party>();
  for (const row of [...(primaryPartyRows ?? []), ...(relatedPartyRows ?? [])] as Array<{ profile_id: string; payload: Party }>) parties.set(row.profile_id, row.payload);
  const identityIds = [...parties.values()].flatMap((party) => party.identityIds);
  const locationIds = [...new Set([...parties.values()].flatMap((party) => party.features.map((feature) => feature.locationId).filter((value): value is string => Boolean(value))))];
  const [{ data: docRows }, { data: locationRows }, refs] = await Promise.all([
    supabase.from("ofac_id_documents").select("identity_id, payload").eq("job_id", job.id).in("identity_id", identityIds.length ? identityIds : ["__none__"]),
    supabase.from("ofac_locations").select("location_id, payload").eq("job_id", job.id).in("location_id", locationIds.length ? locationIds : ["__none__"]),
    loadOfacRefs(supabase, job.id),
  ]);
  const docs = new Map<string, IdDoc[]>();
  for (const row of (docRows ?? []) as Array<{ identity_id: string; payload: IdDoc }>) docs.set(row.identity_id, [...(docs.get(row.identity_id) ?? []), row.payload]);
  const locations = new Map<string, LocationInfo>();
  for (const row of (locationRows ?? []) as Array<{ location_id: string; payload: LocationInfo }>) locations.set(row.location_id, row.payload);
  const byEntry = new Map<string, { related: string; former: boolean }[]>();
  for (const row of relationships) byEntry.set(row.entry_id, [...(byEntry.get(row.entry_id) ?? []), { related: row.related_profile_id, former: row.former }]);
  const stats = createAssemblyStats();
  const staged: Array<{ import_id: string; source_record_id: string; record_hash: string; payload: SanctionsRecord }> = [];
  for (const row of entries) {
    const record = buildOfacRecord(row.payload, { aliasTypes: refs.aliasTypes, featureTypes: refs.featureTypes, detailRefs: refs.detailRefs, countries: refs.countries, legalBases: refs.legalBases, locations, idDocsByIdentity: docs, parties, relationshipsByEntry: byEntry }, stats);
    if (record) staged.push({ import_id: job.import_id, source_record_id: record.source_record_id, record_hash: shortHash(recordFingerprint(record)), payload: record });
  }
  if (staged.length > 0) {
    const { error } = await supabase.from("sanctions_staging").upsert(staged as never, { onConflict: "import_id,source_record_id" });
    if (error) throw new Error(`OFAC staging failed: ${error.message}`);
  }
  const now = new Date().toISOString();
  const { error: markError } = await supabase.from("ofac_entries").update({ processed_at: now }).eq("job_id", job.id).in("entry_id", entryIds);
  if (markError) throw new Error(`OFAC entry checkpoint update failed: ${markError.message}`);
  const counts = { person_count: 0, entity_count: 0, ship_count: 0, aircraft_count: 0, wallet_count: 0 };
  for (const row of staged) {
    if (row.payload.entity_type === "person") counts.person_count += 1;
    else if (row.payload.entity_type === "ship") counts.ship_count += 1;
    else if (row.payload.entity_type === "aircraft") counts.aircraft_count += 1;
    else counts.entity_count += 1;
    if (row.payload.identifiers.some((item) => item.identifier_type === "digital_currency_address")) counts.wallet_count += 1;
  }
  const current = await supabase.from("ofac_import_jobs").select("person_count, entity_count, ship_count, aircraft_count, wallet_count").eq("id", job.id).single();
  if (current.error || !current.data) throw new Error(current.error?.message ?? "OFAC counters could not be loaded");
  await supabase.from("ofac_import_jobs").update({
    staged_entries: job.staged_entries + staged.length,
    person_count: current.data.person_count + counts.person_count,
    entity_count: current.data.entity_count + counts.entity_count,
    ship_count: current.data.ship_count + counts.ship_count,
    aircraft_count: current.data.aircraft_count + counts.aircraft_count,
    wallet_count: current.data.wallet_count + counts.wallet_count,
    updated_at: now,
  } as never).eq("id", job.id);
  return entries.length;
}

export async function runOfacImportSlice(options: { force?: boolean } = {}): Promise<OfacSliceOutcome> {
  const supabase = adminClient();
  let job: Record<string, unknown> | null = null;
  try {
    const { data: active } = await supabase.from("ofac_import_jobs").select("*").in("phase", ["parsing", "assembling", "publishing"]).order("created_at").limit(1).maybeSingle();
    job = active as Record<string, unknown> | null;
    if (!job) {
      const relay = await supabase.from("sanctions_relay_jobs").select("id, chunk_count, total_bytes, ready_at").eq("source_code", OFAC_SOURCE_CODE).eq("status", "ready").order("ready_at", { ascending: false }).limit(1).maybeSingle();
      if (!relay.data) return { status: "waiting_for_relay", message: "No completed OFAC relay file is waiting." };
      const source = await getSource(supabase, OFAC_SOURCE_CODE);
      if (!source.is_active && !options.force) return { status: "skipped", message: "Source is not active." };
      if (!options.force) {
        const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
        const recent = await supabase.from("sanctions_imports").select("completed_at").eq("source_id", source.id).in("status", ["completed", "unchanged"]).gte("completed_at", since).limit(1);
        if (recent.data && recent.data.length > 0) return { status: "skipped", message: "OFAC data is already fresh." };
      }
      // A previous run for this relay file may have ended in `failed`. The row is
      // kept (relay_job_id is UNIQUE), so restart it in place instead of inserting
      // a duplicate — with a cooldown so a hard failure cannot spin every 5 minutes.
      const existing = await supabase.from("ofac_import_jobs").select("*").eq("relay_job_id", relay.data.id).maybeSingle();
      if (existing.data && String(existing.data.phase) === "completed") {
        await markRelayConsumed(supabase, String(relay.data.id));
        return { status: "skipped", message: "This OFAC relay file has already been imported." };
      }
      if (existing.data) {
        const lastTouched = Date.parse(String(existing.data.updated_at ?? existing.data.created_at ?? 0));
        if (Number.isFinite(lastTouched) && Date.now() - lastTouched < 30 * 60 * 1000 && !options.force) {
          return { status: "skipped", message: "The previous OFAC run failed; waiting before retrying." };
        }
      }
      const createdImport = await supabase.from("sanctions_imports").insert({ source_id: source.id, status: "parsing" }).select("id").single();
      if (createdImport.error || !createdImport.data) throw new Error(createdImport.error?.message ?? "Could not create OFAC import");
      const reset = {
        import_id: createdImport.data.id,
        relay_job_id: relay.data.id,
        force_run: Boolean(options.force),
        phase: "parsing",
        next_chunk: 0,
        parser_state: {},
        hash_state: {},
        file_size_bytes: 0,
        parsed_entries: 0,
        staged_entries: 0,
        person_count: 0,
        entity_count: 0,
        ship_count: 0,
        aircraft_count: 0,
        wallet_count: 0,
        attempts: 0,
        lease_until: null,
        last_error: null,
        completed_at: null,
        updated_at: new Date().toISOString(),
      };
      const upserted = existing.data
        ? await supabase.from("ofac_import_jobs").update(reset as never).eq("id", String(existing.data.id)).select("*").single()
        : await supabase.from("ofac_import_jobs").insert(reset as never).select("*").single();
      if (upserted.error || !upserted.data) throw new Error(upserted.error?.message ?? "Could not create OFAC checkpoint");
      if (existing.data) await clearOfacJobWorkspace(supabase, String(existing.data.id));
      job = upserted.data as Record<string, unknown>;
    }

    const jobId = String(job["id"]);
    const importId = String(job["import_id"]);
    const lease = await (supabase.rpc as never as (name: string, args: Record<string, unknown>) => Promise<{ data: boolean | null; error: { message: string } | null }>)("ofac_acquire_job_lease", { _job_id: jobId, _seconds: 120 });
    if (lease.error) throw new Error(lease.error.message);
    if (!lease.data) return { status: "processing", importId, message: "Another OFAC slice is already running." };
    try {
      const phase = String(job["phase"]);
      if (phase === "parsing") {
        const nextChunk = Number(job["next_chunk"] ?? 0);
        const relayJobId = String(job["relay_job_id"]);
        const relay = await supabase.from("sanctions_relay_jobs").select("chunk_count, total_bytes, ready_at").eq("id", relayJobId).single();
        if (relay.error || !relay.data) throw new Error(relay.error?.message ?? "Relay job disappeared");
        const chunk = await supabase.from("sanctions_relay_chunks").select("body, byte_length").eq("job_id", relayJobId).eq("chunk_index", nextChunk).maybeSingle();
        if (chunk.error) throw new Error(chunk.error.message);
        if (!chunk.data) throw new Error(`Relay chunk ${nextChunk} is missing`);
        const parserState = (job["parser_state"] ?? {}) as Partial<OfacCheckpoint>;
        const state: OfacCheckpoint = { buffer: parserState.buffer ?? "", sawRoot: parserState.sawRoot ?? false, rootClosed: parserState.rootClosed ?? false, section: parserState.section ?? null };
        const consumed = consumeOfacChunk(state, chunk.data.body as string);
        await persistOfacBlocks(supabase, jobId, consumed.blocks);
        const hasher = Object.keys((job["hash_state"] ?? {}) as object).length > 0 ? StreamingSha256.restore(job["hash_state"] as ReturnType<StreamingSha256["checkpoint"]>) : new StreamingSha256();
        hasher.update(new TextEncoder().encode(chunk.data.body as string));
        const newNext = nextChunk + 1;
        const finished = newNext >= Number(relay.data.chunk_count);
        if (finished) finishOfacCheckpoint(consumed.state);
        await supabase.from("ofac_import_jobs").update({ next_chunk: newNext, parser_state: consumed.state, hash_state: hasher.checkpoint(), file_size_bytes: Number(job["file_size_bytes"] ?? 0) + Number(chunk.data.byte_length), phase: finished ? "assembling" : "parsing", updated_at: new Date().toISOString(), lease_until: null } as never).eq("id", jobId);
        await supabase.from("sanctions_imports").update({ diagnostic_details: { stage: finished ? "assembling" : "parsing", nextChunk: newNext, totalChunks: relay.data.chunk_count, heartbeatAt: new Date().toISOString(), parser: "ofac-checkpoint-v1" } as never }).eq("id", importId);
        return { status: finished ? "ready_to_publish" : "processing", importId, nextChunk: newNext, message: finished ? "OFAC relay parsing completed; assembly is queued." : `Processed OFAC relay chunk ${newNext}/${relay.data.chunk_count}.` };
      }
      if (phase === "assembling") {
        const processed = await assembleOfacBatch(supabase, { id: jobId, import_id: importId, staged_entries: Number(job["staged_entries"] ?? 0) });
        if (processed > 0) return { status: "processing", importId, staged: Number(job["staged_entries"] ?? 0) + processed, message: `Assembled ${processed} OFAC entries.` };
        await supabase.from("ofac_import_jobs").update({ phase: "publishing", lease_until: null, updated_at: new Date().toISOString() }).eq("id", jobId);
        return { status: "ready_to_publish", importId, message: "OFAC records are staged and ready to publish." };
      }
      const current = await supabase.from("ofac_import_jobs").select("*").eq("id", jobId).single();
      if (current.error || !current.data) throw new Error(current.error?.message ?? "OFAC job disappeared");
      const count = Number(current.data.staged_entries);
      if (count < 1) throw new Error("OFAC import produced zero records");
      const hash = StreamingSha256.restore(current.data.hash_state as ReturnType<StreamingSha256["checkpoint"]>).digestHex();
      const previous = await supabase.from("sanctions_imports").select("record_count").eq("source_id", (await getSource(supabase, OFAC_SOURCE_CODE)).id).eq("status", "completed").order("completed_at", { ascending: false }).limit(1).maybeSingle();
      const previousCount = previous.data?.record_count ?? 0;
      if (previousCount > 0 && count < previousCount * (1 - MAX_RECORD_DROP)) throw new Error(`Record count fell from ${previousCount} to ${count}; keeping the previous dataset.`);
      const published = await (supabase.rpc as never as (name: string, args: Record<string, unknown>) => Promise<{ data: Array<{ active_total: number }> | null; error: { message: string } | null }>)("sanctions_publish_import", { _import_id: importId });
      if (published.error) throw new Error(`Publication failed: ${published.error.message}`);
      await supabase.from("sanctions_imports").update({ file_hash_sha256: hash, file_size_bytes: Number(current.data.file_size_bytes), source_last_modified: new Date().toISOString(), retrieved_at: new Date().toISOString(), diagnostic_details: { stage: "completed", parser: "ofac-checkpoint-v1", chunksRead: current.data.next_chunk, recordsStaged: count } as never }).eq("id", importId);
      await supabase.from("ofac_import_jobs").update({ phase: "completed", completed_at: new Date().toISOString(), lease_until: null }).eq("id", jobId);
      await markRelayConsumed(supabase, String(current.data.relay_job_id));
      await (supabase.rpc as never as (name: string, args: Record<string, unknown>) => Promise<unknown>)("sanctions_unlock", { _source_code: OFAC_SOURCE_CODE });
      return { status: "completed", importId, staged: count, message: `Published ${published.data?.[0]?.active_total ?? count} OFAC records.` };
    } finally {
      await (supabase.rpc as never as (name: string, args: Record<string, unknown>) => Promise<unknown>)("ofac_release_job_lease", { _job_id: jobId });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected OFAC slice failure";
    const importId = job?.["import_id"] ? String(job["import_id"]) : null;
    const attempts = Number(job?.["attempts"] ?? 0) + 1;
    const terminal = attempts >= 3;
    if (job?.["id"]) await supabase.from("ofac_import_jobs").update({ attempts, phase: terminal ? "failed" : job["phase"], completed_at: terminal ? new Date().toISOString() : null, last_error: message, lease_until: null, updated_at: new Date().toISOString() } as never).eq("id", String(job["id"]));
    if (importId) {
      if (terminal) await failImport(supabase, importId, message, { stage: "slice-error", attempts });
      else await supabase.from("sanctions_imports").update({ error_message: message, diagnostic_details: { stage: "slice-error", message, attempts, heartbeatAt: new Date().toISOString() } as never }).eq("id", importId);
    }
    if (terminal) await (supabase.rpc as never as (name: string, args: Record<string, unknown>) => Promise<unknown>)("sanctions_unlock", { _source_code: OFAC_SOURCE_CODE });
    return { status: "failed", importId, message };
  }
}

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
    const { response, urlUsed, attempts: downloadAttempts } = await fetchSanctionsSource(sourceCode, source.source_url);
    if (!response) {
      const detail = "Source is unreachable (network/TLS failure after retries).";
      await failImport(supabase, importId, detail, { stage: "download", downloadAttempts });
      return { importId, status: "failed", message: detail };
    }
    const finalHost = response.url ? new URL(response.url).host : null;
    if (response.status !== 200) {
      const detail = `Source returned HTTP ${response.status} ${response.statusText}`;
      await failImport(supabase, importId, detail, {
        stage: "download",
        status: response.status,
        finalHost,
        urlUsed,
        downloadAttempts,
      });
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

    // Resumable read: an interrupted transfer continues with a Range request
    // from the last received byte instead of re-downloading the whole feed.
    const download = createResumableBody(response, urlUsed ?? source.source_url);
    let bytes: Uint8Array;
    try {
      bytes = await collectStream(download.stream);
    } catch (error) {
      const detail = `Download interrupted: ${error instanceof Error ? error.message : "unknown error"}`;
      await failImport(supabase, importId, detail, {
        stage: "download",
        finalHost,
        urlUsed,
        downloadAttempts,
        resumeLog: download.resumeLog,

        receivedBytes: download.receivedBytes(),
        totalBytes: download.totalBytes,
      });
      return { importId, status: "failed", message: detail };
    }
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
        official_digest_sha256: officialDigest?.sha256Hex ?? null,
        official_digest_header: officialDigest ? `${officialDigest.header}: ${officialDigest.raw}` : null,
        digest_mismatch: false,
      } as never)
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
          officialDigest: officialDigest?.sha256Hex ?? null,
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

    // The scheduler runs this worker several times a day so a CDN/TLS blip at
    // one hour no longer costs a whole day of freshness. A successful run in
    // the last 20 hours means there is nothing to do — skip before spending
    // the ~126 MB download.
    if (!options.force) {
      const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("sanctions_imports")
        .select("id, completed_at")
        .eq("source_id", source.id)
        .in("status", ["completed", "unchanged"])
        .gte("completed_at", since)
        .order("completed_at", { ascending: false })
        .limit(1);
      if (recent && recent.length > 0) {
        return {
          importId: null,
          status: "skipped",
          message: `Already updated at ${recent[0]!.completed_at} — skipping until the next daily window.`,
        };
      }
    }



    const { data: created, error: createError } = await supabase
      .from("sanctions_imports")
      .insert({ source_id: source.id, status: "started" })
      .select("id")
      .single();
    if (createError || !created) throw new Error(createError?.message ?? "Could not create import run");
    importId = created.id;

    // 1. open the stream --------------------------------------------------
    // Preferred transport is the database relay: Treasury's edge refuses the
    // TLS handshake from our hosting network (HTTP 525), so a scheduled SQL
    // job pulls the file into the database in ranged pieces. A direct fetch is
    // still attempted when no relayed copy is waiting.
    await supabase.from("sanctions_imports").update({ status: "downloading" }).eq("id", importId);
    const downloadStartedAt = Date.now();
    const relay = await openRelayDownload(supabase, sourceCode);

    let bodyStream: ReadableStream<Uint8Array>;
    let resumeLog: ResumeEvent[] = [];
    let finalHost: string | null = null;
    let contentType = "";
    let etagHeader: string | null = null;
    let officialDigest: ReturnType<typeof extractOfficialDigest> = null;
    let sourceLastModified: string | null = null;
    let fileName: string;
    let downloadAttempts: Array<{ url: string; outcome: string }> = [];
    const retrievedAt = new Date();

    if (relay) {
      bodyStream = relay.stream;
      finalHost = "database-relay";
      contentType = "application/xml";
      sourceLastModified = relay.readyAt;
      fileName = `ofac-sdn-${retrievedAt.toISOString().slice(0, 10)}.xml`;
    } else {
      const direct = await fetchSanctionsSource(sourceCode, source.source_url);
      const response = direct.response;
      downloadAttempts = direct.attempts;
      if (!response) {
        const detail = "Source is unreachable (network/TLS failure after retries) and no relayed copy is ready yet.";
        await failImport(supabase, importId, detail, { stage: "download", downloadAttempts, relay: "pending" });
        return { importId, status: "failed", message: detail };
      }
      finalHost = response.url ? new URL(response.url).host : null;
      if (response.status !== 200) {
        const detail = `Source returned HTTP ${response.status} ${response.statusText}`;
        await failImport(supabase, importId, detail, {
          stage: "download",
          status: response.status,
          finalHost,
          urlUsed: direct.urlUsed,
          downloadAttempts,
        });
        return { importId, status: "failed", message: detail };
      }
      contentType = response.headers.get("content-type") ?? "";
      etagHeader = response.headers.get("etag");
      officialDigest = extractOfficialDigest(response.headers);
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
      const lastModifiedHeader = response.headers.get("last-modified");
      sourceLastModified = lastModifiedHeader ? new Date(lastModifiedHeader).toISOString() : null;
      fileName =
        /filename="([^"]+)"/.exec(response.headers.get("content-disposition") ?? "")?.[1] ??
        `ofac-sdn-${retrievedAt.toISOString().slice(0, 10)}.xml`;
      const resumable = createResumableBody(response, direct.urlUsed ?? source.source_url);
      bodyStream = resumable.stream;
      resumeLog = resumable.resumeLog;
    }


    // 2. stream: hash + parse + stage, chunk by chunk ----------------------
    await supabase.from("sanctions_imports").update({ status: "parsing" }).eq("id", importId);
    const hasher = new StreamingSha256();
    const parser = new OfacStreamParser();
    const decoder = new TextDecoder("utf-8");
    const parseStartedAt = Date.now();
    const rssBefore = nodeRssMb();

    // Per-stage performance instrumentation (download/hash/stage/validate/publish)
    // so admins can confirm the worker fits runtime limits before scheduling.
    const perf = {
      downloadMs: 0,
      hashingMs: 0,
      stagingMs: 0,
      validationMs: 0,
      publishMs: 0,
      archiveMs: 0,
      rssStartMb: rssBefore,
      rssPeakMb: rssBefore,
      rssEndMb: null as number | null,
    };
    const sampleRss = () => {
      const now = nodeRssMb();
      if (now !== null) perf.rssPeakMb = Math.max(perf.rssPeakMb ?? now, now);
    };

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
      const flushStartedAt = Date.now();
      const { error } = await supabase.from("sanctions_staging").insert(batch as never);
      perf.stagingMs += Date.now() - flushStartedAt;
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

    // Relay chunks arrive from the database; a direct download is resumable so
    // a dropped connection continues with `Range: bytes=<received>-`.
    const reader = bodyStream.getReader();

    // Heartbeat: the run has been dying silently mid-parse, so persist progress
    // as it goes. A stalled run then shows exactly how far it got before it was
    // cut off instead of an empty "parsing" row.
    let lastHeartbeatAt = 0;
    const heartbeat = async (note: string) => {
      lastHeartbeatAt = Date.now();
      await supabase
        .from("sanctions_imports")
        .update({
          diagnostic_details: {
            stage: "parsing",
            note,
            transport: relay ? "database-relay" : "direct",
            bytesRead: fileSizeBytes,
            recordsParsed: parsed,
            chunksRead: chunkIndex,
            elapsedMs: Date.now() - parseStartedAt,
            rssMb: nodeRssMb(),
            heartbeatAt: new Date().toISOString(),
          } as never,
        } as never)
        .eq("id", importId!);
    };

    let chunkIndex = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      fileSizeBytes += value.byteLength;
      const hashStartedAt = Date.now();
      hasher.update(value);
      perf.hashingMs += Date.now() - hashStartedAt;
      for (const record of parser.feed(decoder.decode(value, { stream: true }))) {
        await stageRecord(record);
      }
      chunkIndex += 1;
      if (chunkIndex % 16 === 0) sampleRss();
      if (Date.now() - lastHeartbeatAt > 10_000) await heartbeat("streaming");
    }
    await heartbeat("stream-drained");

    const tail = parser.finish();
    for (const record of tail.records) await stageRecord(record);
    await flush();
    const parseDurationMs = Date.now() - parseStartedAt;
    perf.downloadMs = Date.now() - downloadStartedAt;
    const rssAfter = nodeRssMb();
    perf.rssEndMb = rssAfter;
    sampleRss();

    if (fileSizeBytes < adapter.minBytes) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
      const detail = `Source file is too small (${fileSizeBytes} bytes); refusing to import.`;
      await failImport(supabase, importId, detail, { stage: "validate", size: fileSizeBytes, finalHost });
      return { importId, status: "failed", message: detail };
    }

    const fileHash = hasher.digestHex();

    // The relayed bytes are fully parsed and staged now — release the copy so
    // the next scheduled transfer can start and the 126 MB text is not kept.
    if (relay) await markRelayConsumed(supabase, relay.jobId);


    // Integrity gate: if the source published a SHA-256 digest and our
    // downloaded bytes do not match, fail loudly — never publish.
    const digestMismatch = digestMismatchReport(fileHash, officialDigest);
    if (digestMismatch) {
      await supabase.from("sanctions_staging").delete().eq("import_id", importId);
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
          official_digest_sha256: officialDigest?.sha256Hex ?? null,
          official_digest_header: officialDigest ? `${officialDigest.header}: ${officialDigest.raw}` : null,
          digest_mismatch: false,
          diagnostic_details: {
            finalHost,
            contentType,
            etag: etagHeader,
            perf,
            resumeLog,
            parser: "ofac-advanced-v3-stream",
          } as never,
        } as never)
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
    // upload; Storage handles the streamed request body on its side. Relayed
    // imports skip this: the origin is unreachable from this network.
    const archiveStartedAt = Date.now();
    let storagePath: string | null = null;
    try {
      const archiveResponse = relay
        ? null
        : (await fetchSanctionsSource(source.source_code, source.source_url, { attemptsPerUrl: 2 })).response;
      if (archiveResponse?.ok && archiveResponse.body) {
        storagePath = storagePathFor(adapter.storagePrefix, fileHash, retrievedAt);
        // Resumable so a dropped archive transfer continues instead of restarting.
        const archiveStream = createResumableBody(archiveResponse, source.source_url).stream;

        const { error: uploadError } = await supabase.storage
          .from(SANCTIONS_BUCKET)
          .upload(storagePath, archiveStream as never, {
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
    perf.archiveMs = Date.now() - archiveStartedAt;
    sampleRss();

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
        official_digest_sha256: officialDigest?.sha256Hex ?? null,
        official_digest_header: officialDigest ? `${officialDigest.header}: ${officialDigest.raw}` : null,
        digest_mismatch: false,
      } as never)
      .eq("id", importId);

    // 4. sanity checks before publishing -----------------------------------
    const validationStartedAt = Date.now();
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
    perf.validationMs = Date.now() - validationStartedAt;

    // 5. atomic publication -------------------------------------------------
    const publishStartedAt = Date.now();
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

    perf.publishMs = Date.now() - publishStartedAt;
    sampleRss();

    const result = Array.isArray(published) ? published[0] : published;
    await supabase
      .from("sanctions_imports")
      .update({
        diagnostic_details: {
          finalHost,
          contentType,
          etag: etagHeader,
          officialDigest: officialDigest?.sha256Hex ?? null,
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
          perf,
          resumeLog,
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
/** Reads at most `maxBytes` from a response body, then cancels the stream. */
async function readSample(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged.slice(0, maxBytes));
}

export async function testSanctionsConnection(sourceCode: string) {
  const supabase = adminClient();
  const source = await getSource(supabase, sourceCode);
  const startedAt = Date.now();
  let ok = false;
  let detail: string;
  let status: number | null = null;
  let contentType: string | null = null;
  let finalHost: string | null = null;
  let usedMirror = false;

  try {
    const { response, urlUsed } = await fetchSanctionsSource(sourceCode, source.source_url);
    if (!response) throw new Error("Source is unreachable (network/TLS failure after retries).");
    usedMirror = urlUsed !== null && urlUsed !== source.source_url;
    status = response.status;
    finalHost = response.url ? new URL(response.url).host : null;
    contentType = response.headers.get("content-type");
    // Read only the first chunk: OFAC's feed is 126 MB and buffering it here
    // would exhaust the worker's memory during a simple connection test.
    const sample = await readSample(response, 4096);
    if (status !== 200) {
      detail = `HTTP ${status} ${response.statusText}`;
    } else if (/^\s*</.test(sample) && !/^\s*<(!DOCTYPE\s+html|html)\b/i.test(sample)) {
      ok = true;
      detail = `OK — XML response from ${finalHost ?? "source"}${usedMirror ? " (via mirror)" : ""} (${Date.now() - startedAt} ms)`;
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
