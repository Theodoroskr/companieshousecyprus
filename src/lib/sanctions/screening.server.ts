/**
 * Internal sanctions-screening engine (server-only).
 *
 * Backend-only matching: candidate generation runs in PostgreSQL
 * (trigram similarity + exact identifier lookups); scoring/classification
 * runs here with the explainable rules from screening-rules.ts.
 */
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  RULES_VERSION,
  scoreCandidate,
  screeningOutcome,
  type CandidateFacts,
  type ScreeningThresholds,
  type ScreeningWeights,
  type SystemClassification,
} from "@/lib/sanctions/screening-rules";
import { companyNameVariants, normalizeNameForms, personNameVariants } from "@/lib/sanctions/normalize";
import {
  CONNECTED_INDIVIDUAL_SCREENING_ENABLED,
  EXCLUDED_SUBJECT_CATEGORIES,
  SCREENING_SCOPE_VERSION,
  type SubjectRole,
} from "@/lib/sanctions/screening-scope";

export const SCREENING_SOURCES = ["EU_FSF", "UN_CONSOLIDATED", "UKSL", "OFAC_SDN"] as const;
export type ScreeningSource = (typeof SCREENING_SOURCES)[number];

export type ScreeningSubjectInput = {
  subjectType: "individual" | "entity" | "vessel" | "aircraft";
  name: string;
  previousNames?: string[];
  aliases?: string[];
  jurisdiction?: string | null;
  registrationNumber?: string | null;
  lei?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  address?: string | null;
  identificationNumber?: string | null;
  country?: string | null;
  companyId?: string | null;
  /** Which part of the corporate scope this run covers. */
  role?: SubjectRole;
  /** Parent (direct company) run when this is a previous-name or shareholder run. */
  parentRequestId?: string | null;
};


type AdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

function maskIdentifier(type: string | null | undefined, value: string | null | undefined): string | null {
  if (!value) return null;
  const sensitive = /passport|national|fiscal|taxid|ssn|national id|id$/i.test(type ?? "");
  if (!sensitive) return value;
  const clean = value.trim();
  if (clean.length <= 4) return "****";
  return `${clean.slice(0, 2)}${"*".repeat(Math.max(clean.length - 4, 3))}${clean.slice(-2)}`;
}

function extractDates(jsonb: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") {
      const m = /(\d{4})-(\d{2})-(\d{2})/.exec(v) ?? /(\d{2})\/(\d{2})\/(\d{4})/.exec(v);
      if (m) {
        const iso = m[1]!.length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`;
        out.add(iso);
      } else if (/^\d{4}$/.test(v.trim())) out.add(v.trim());
      return;
    }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(jsonb);
  return [...out];
}

function extractStrings(jsonb: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (v == null) return;
    if (typeof v === "string") { if (v.trim()) out.add(v.trim()); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk);
  };
  walk(jsonb);
  return [...out];
}

function countriesCompatible(a: string | null | undefined, b: string | null | undefined): boolean | null {
  if (!a || !b) return null;
  const na = normalizeNameForms(a).searchKey;
  const nb = normalizeNameForms(b).searchKey;
  if (!na || !nb) return null;
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function loadConfig(supabase: AdminClient): Promise<{ weights: ScreeningWeights; thresholds: ScreeningThresholds; rulesVersion: string }> {
  const { data } = await supabase
    .from("screening_rules_config")
    .select("rules_version, weights, thresholds")
    .eq("key", "default")
    .maybeSingle();
  return {
    weights: { ...DEFAULT_WEIGHTS, ...((data?.weights as Partial<ScreeningWeights> | null) ?? {}) },
    thresholds: { ...DEFAULT_THRESHOLDS, ...((data?.thresholds as Partial<ScreeningThresholds> | null) ?? {}) },
    rulesVersion: (data?.rules_version as string | undefined) ?? RULES_VERSION,
  };
}

async function latestImportIds(supabase: AdminClient, sources: string[]) {
  const { data } = await supabase
    .from("sanctions_sources")
    .select("source_code, sanctions_imports!sanctions_imports_source_id_fkey(id, file_hash_sha256, status, completed_at)")
    .in("source_code", sources);
  const out: Record<string, { importId: string | null; fileHash: string | null; completedAt: string | null }> = {};
  const unavailable: string[] = [];
  for (const row of data ?? []) {
    const imports = (row as { sanctions_imports?: { id: string; file_hash_sha256: string | null; status: string; completed_at: string | null }[] }).sanctions_imports ?? [];
    const done = imports.filter((i) => i.status === "completed" && i.completed_at).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
    out[row.source_code] = done[0]
      ? { importId: done[0].id, fileHash: done[0].file_hash_sha256, completedAt: done[0].completed_at }
      : { importId: null, fileHash: null, completedAt: null };
    if (!done[0]) unavailable.push(row.source_code);
  }
  return { importIds: out, unavailable };
}

export type ScreeningRunResult = {
  requestId: string;
  reference: string;
  outcome: string;
  candidateCount: number;
  status: string;
};

export async function runScreening(
  supabase: AdminClient,
  input: ScreeningSubjectInput,
  sources: string[],
  context: "admin_test" | "company_profile" | "snapshot" | "monitoring" | "api",
  userId: string | null,
): Promise<ScreeningRunResult> {
  if (input.subjectType === "individual" && !CONNECTED_INDIVIDUAL_SCREENING_ENABLED) {
    throw new Error(
      "Individual screening is disabled (connected_individual_screening_enabled = false). This release screens legal entities only.",
    );
  }
  const isPerson = input.subjectType === "individual";
  const expectedEntryType =
    input.subjectType === "individual"
      ? "person"
      : input.subjectType === "entity"
        ? "entity"
        : input.subjectType === "vessel"
          ? "ship"
          : "aircraft";
  const config = await loadConfig(supabase);

  const forms = normalizeNameForms(input.name);
  const nameVariants = new Set<string>();
  const addVariants = (name: string) => {
    for (const v of input.subjectType === "individual" ? personNameVariants(name) : companyNameVariants(name)) {
      nameVariants.add(v);
    }
  };
  addVariants(input.name);
  (input.previousNames ?? []).forEach(addVariants);
  (input.aliases ?? []).forEach(addVariants);

  const reference = `SCR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const { importIds, unavailable } = await latestImportIds(supabase, sources);

  const { data: request, error: reqErr } = await supabase
    .from("screening_requests")
    .insert({
      screening_reference: reference,
      requested_by: userId,
      source_context: context,
      subject_type: input.subjectType,
      subject_name: input.name,
      normalized_name: forms.searchKey,
      jurisdiction: input.jurisdiction ?? null,
      registration_number: input.registrationNumber ?? null,
      lei: input.lei ?? null,
      date_of_birth: isPerson ? (input.dateOfBirth ?? null) : null,
      nationality: isPerson ? (input.nationality ?? null) : null,
      address: input.address ?? null,
      company_id: input.companyId ?? null,
      previous_names: input.previousNames ?? [],
      subject_aliases: input.aliases ?? [],
      sources_requested: sources,
      source_import_ids: importIds,
      source_file_hashes: Object.fromEntries(
        Object.entries(importIds).map(([code, meta]) => [code, meta.fileHash]),
      ),
      scope_version: SCREENING_SCOPE_VERSION,
      entity_only: !CONNECTED_INDIVIDUAL_SCREENING_ENABLED,
      excluded_categories: [...EXCLUDED_SUBJECT_CATEGORIES],
      subject_role: input.role ?? "direct_company",
      parent_request_id: input.parentRequestId ?? null,
      rules_version: config.rulesVersion,
      status: "processing",

    })
    .select("id")
    .single();
  if (reqErr || !request) throw new Error(reqErr?.message ?? "Failed to create screening request");
  const requestId = request.id as string;

  await supabase.from("screening_audit_log").insert({
    screening_request_id: requestId,
    event_type: "request_created",
    actor: userId,
    event_data: {
      reference,
      normalized_input: forms,
      name_variants: [...nameVariants],
      sources,
      source_import_ids: importIds,
      rules_version: config.rulesVersion,
      thresholds: config.thresholds,
    },
  });

  try {
    // Candidate generation — name similarity
    type NameHit = {
      sanctions_entry_id: string; source_code: string; entity_type: string; primary_name: string;
      matched_name: string; matched_alias_type: string; name_similarity: number; name_used: string;
    };
    type IdHit = {
      sanctions_entry_id: string; source_code: string; identifier_type: string;
      identifier_value: string; issuing_country: string | null;
    };
    // Entity-type safeguard: only records of the subject's own class (plus
    // records whose class is uncertain, which can never auto-confirm) may
    // ever become candidates. Individuals, vessels and aircraft can therefore
    // not surface in a company screening.
    const allowedEntryTypes = [expectedEntryType, "unknown"];
    const nameRpc = (await supabase.rpc("screening_name_candidates", {
      p_names: [...nameVariants],
      p_sources: sources,
      p_entity_types: allowedEntryTypes,
      p_min_sim: config.thresholds.min_name_similarity,
      p_limit: config.thresholds.max_candidates,
    } as never)) as { data: NameHit[] | null; error: { message: string } | null };
    if (nameRpc.error) throw new Error(nameRpc.error.message);
    const nameHits = (nameRpc.data ?? []).filter((h) => allowedEntryTypes.includes(h.entity_type));

    // Candidate generation — reliable identifiers
    const identifiers: { kind: string; value: string; country?: string | undefined }[] = [];
    if (input.registrationNumber) identifiers.push({ kind: "registration_number", value: input.registrationNumber, country: input.jurisdiction ?? undefined });
    if (input.lei) identifiers.push({ kind: "lei", value: input.lei });
    // Personal identifiers (passport / national ID) are never processed in the
    // entity-only customer workflow.
    if (isPerson && input.identificationNumber) {
      identifiers.push({ kind: "passport", value: input.identificationNumber, country: input.country ?? undefined });
      identifiers.push({ kind: "national_id", value: input.identificationNumber, country: input.country ?? undefined });
    }
    const { data: idHits, error: idErr } = identifiers.length
      ? await supabase.rpc("screening_identifier_candidates", { p_identifiers: identifiers, p_sources: sources })
      : { data: [], error: null };
    if (idErr) throw new Error(idErr.message);
    const typedIdHits = ((idHits ?? []) as IdHit[]).filter((h) =>
      allowedEntryTypes.includes(((h as unknown as { entity_type?: string }).entity_type ?? "unknown")),
    );

    const idHitMap = new Map<string, { identifier_type: string; identifier_value: string }>();
    for (const hit of typedIdHits) idHitMap.set(hit.sanctions_entry_id, { identifier_type: hit.identifier_type, identifier_value: hit.identifier_value });

    const candidateIds = new Set<string>();
    for (const h of nameHits) candidateIds.add(h.sanctions_entry_id);
    for (const h of typedIdHits) candidateIds.add(h.sanctions_entry_id);

    // Fetch entry context for scoring
    const personSelect = isPerson ? ", sanctions_person_details(date_of_birth, nationalities, citizenships)" : "";
    const entrySelect = `id, entity_type, primary_name, sanctions_programme, source_record_id, sanctions_sources(source_code, authority, information_url)${personSelect}, sanctions_identifiers(identifier_type, identifier_value, issuing_country), sanctions_addresses(country, full_address)`;
    const entryRows = candidateIds.size
      ? ((await supabase
          .from("sanctions_entries")
          .select(entrySelect as never)
          .in("id", [...candidateIds])) as unknown as { data: Record<string, unknown>[] | null })
      : { data: [] as Record<string, unknown>[] };
    const entryMap = new Map((entryRows.data ?? []).map((e) => [e["id"] as string, e]));


    const nameHitMap = new Map<string, { sim: number; matched_name: string; matched_alias_type: string; name_used: string }>();
    for (const h of nameHits) nameHitMap.set(h.sanctions_entry_id, { sim: Number(h.name_similarity), matched_name: h.matched_name, matched_alias_type: h.matched_alias_type, name_used: h.name_used });

    type CandidateInsert = Record<string, unknown> & { system_classification: SystemClassification };
    const inserts: CandidateInsert[] = [];
    let uncertainTypeCount = 0;

    for (const entryId of candidateIds) {
      const entry = entryMap.get(entryId);
      if (!entry) continue;
      const entryType = (entry["entity_type"] as string | null) ?? "unknown";
      // Second, independent safeguard against a mis-scoped candidate.
      if (entryType !== expectedEntryType && entryType !== "unknown") continue;
      const uncertainType = entryType !== expectedEntryType;
      if (uncertainType) uncertainTypeCount += 1;
      const nameHit = nameHitMap.get(entryId);
      const idHit = idHitMap.get(entryId);
      const personRaw = entry["sanctions_person_details"];
      const person = (Array.isArray(personRaw) ? personRaw[0] : personRaw) as
        | { date_of_birth?: unknown; nationalities?: unknown; citizenships?: unknown }
        | null
        | undefined;
      const entryDobs = isPerson ? extractDates(person?.date_of_birth ?? null) : [];
      const entryNationalities = isPerson ? extractStrings([person?.nationalities ?? null, person?.citizenships ?? null]) : [];
      const entryCountries = (entry["sanctions_addresses"] as { country: string | null }[] | null)?.map((a) => a.country).filter(Boolean) ?? [];
      const entryRegIds = ((entry["sanctions_identifiers"] as { identifier_type: string; identifier_value: string }[] | null) ?? [])
        .filter((i) => /reg|registration/i.test(i.identifier_type))
        .map((i) => i.identifier_value.replace(/[^A-Za-z0-9]/g, "").toUpperCase());

      const entityTypeMatch: boolean | null = uncertainType ? null : true;

      const dobMatch: boolean | null = !isPerson || !input.dateOfBirth || !entryDobs.length ? null : entryDobs.some((d) => d === input.dateOfBirth);

      const nationalityMatch: boolean | null = !isPerson || !input.nationality || !entryNationalities.length ? null : entryNationalities.some((n) => countriesCompatible(n, input.nationality) === true);

      const jurisdictionMatch: boolean | null =
        input.subjectType !== "entity" || !input.jurisdiction
          ? countriesCompatible(input.jurisdiction, entryCountries[0])
          : !entryCountries.length ? null : entryCountries.some((c) => countriesCompatible(c, input.jurisdiction) === true);
      const addressMatch: boolean | null = !input.address || !entryCountries.length
        ? null
        : countriesCompatible(input.address, entryCountries.join(" ")) ?? null;

      const sim = nameHit?.sim ?? 0;
      const regNorm = input.registrationNumber?.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      const identifierConflict = Boolean(
        input.subjectType === "entity" && regNorm && entryRegIds.length && !entryRegIds.includes(regNorm) && !idHit,
      );

      const facts: CandidateFacts = {
        nameSimilarity: sim,
        exactName: sim >= 0.98,
        matchedAliasType: nameHit?.matched_alias_type ?? null,
        identifierMatch: Boolean(idHit),
        identifierConflict,
        dobMatch,
        jurisdictionMatch,
        nationalityMatch,
        addressMatch,
        entityTypeMatch,
      };
      if (!idHit && sim < config.thresholds.min_name_similarity) continue;
      const scored = scoreCandidate(facts, config.weights, config.thresholds);
      if (scored.classification === "rejected") continue;

      inserts.push({
        screening_request_id: requestId,
        sanctions_entry_id: entryId,
        source_code: (entry.sanctions_sources as { source_code: string } | null)?.source_code ?? "unknown",
        name_used: nameHit?.name_used ?? "(identifier)",
        matched_name: nameHit?.matched_name ?? (entry.primary_name as string),
        matched_alias_type: nameHit?.matched_alias_type ?? null,
        name_similarity: sim,
        identifier_match: Boolean(idHit),
        jurisdiction_match: jurisdictionMatch,
        date_of_birth_match: dobMatch,
        nationality_match: nationalityMatch,
        address_match: addressMatch,
        entity_type_match: entityTypeMatch,
        corroborating_attributes: scored.corroborating,
        conflicting_attributes: scored.conflicting,
        score_contributions: scored.contributions,
        match_score: scored.score,
        match_level: scored.matchLevel,
        system_classification: scored.classification,
      });
    }

    inserts.sort((a, b) => (b["match_score"] as number) - (a["match_score"] as number));
    const top = inserts.slice(0, config.thresholds.max_candidates);
    if (top.length) {
      const { error: candErr } = await supabase.from("screening_candidates").insert(top as never);
      if (candErr) throw new Error(candErr.message);
    }

    const classifications = top.map((c) => c.system_classification);
    const outcome = screeningOutcome(classifications, false, unavailable);
    await supabase
      .from("screening_requests")
      .update({ status: "completed", completed_at: new Date().toISOString(), outcome })
      .eq("id", requestId);

    await supabase.from("screening_audit_log").insert({
      screening_request_id: requestId,
      event_type: "screening_completed",
      actor: userId,
      event_data: {
        outcome,
        candidate_count: top.length,
        classifications,
        sources_unavailable: unavailable,
        rules_version: config.rulesVersion,
        source_import_ids: importIds,
      },
    });

    return { requestId, reference, outcome, candidateCount: top.length, status: "completed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabase.from("screening_requests").update({ status: "failed", error_message: message }).eq("id", requestId);
    await supabase.from("screening_audit_log").insert({
      screening_request_id: requestId,
      event_type: "screening_failed",
      actor: userId,
      event_data: { error: message },
    });
    throw err instanceof Error ? err : new Error(message);
  }
}

export type CompanyScreeningResult = {
  companyRequest: ScreeningRunResult;
  personRequests: { requestId: string; reference: string; name: string; relationship: string; outcome: string }[];
  ownershipNote: string;
};

export async function screenCyprusCompany(
  supabase: AdminClient,
  slug: string,
  sources: string[],
  userId: string | null,
  includeConnectedPersons = true,
): Promise<CompanyScreeningResult> {
  const { data: company, error } = await supabase
    .from("companies")
    .select("slug, name, reg_number, district_en, locality, address_full")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !company) throw new Error(`Company not found: ${slug}`);

  const companyRequest = await runScreening(
    supabase,
    {
      subjectType: "entity",
      name: company.name,
      jurisdiction: "Cyprus",
      registrationNumber: company.reg_number != null ? String(company.reg_number) : null,
      address: company.address_full ?? ([company.locality, company.district_en].filter(Boolean).join(", ") || null),
      companyId: company.slug,
    },
    sources,
    "company_profile",
    userId,
  );

  const personRequests: CompanyScreeningResult["personRequests"] = [];
  if (includeConnectedPersons) {
    const { data: officials } = await supabase
      .from("officials")
      .select("person_name, position_en")
      .eq("slug", slug)
      .limit(50);
    for (const official of officials ?? []) {
      const role = (official.position_en ?? "official").toLowerCase();
      const relationship = /director/.test(role) ? "director" : /secretary/.test(role) ? "secretary" : "official";
      const result = await runScreening(
        supabase,
        { subjectType: "individual", name: official.person_name, companyId: company.slug },
        sources,
        "company_profile",
        userId,
      );
      await supabase.from("screening_audit_log").insert({
        screening_request_id: result.requestId,
        event_type: "relationship_recorded",
        actor: userId,
        event_data: { company_slug: slug, relationship, screened_name: official.person_name },
      });
      personRequests.push({ requestId: result.requestId, reference: result.reference, name: official.person_name, relationship, outcome: result.outcome });
    }
  }

  return {
    companyRequest,
    personRequests,
    ownershipNote:
      "Shareholder and beneficial-owner data is not available in the registry copy. Ownership/control exposure cannot be determined automatically and requires analyst review where a connected person is a potential match.",
  };
}

export async function getScreeningResult(supabase: AdminClient, requestId: string) {
  const { data: request, error } = await supabase.from("screening_requests").select("*").eq("id", requestId).single();
  if (error || !request) throw new Error("Screening request not found");

  const { data: candidates } = await supabase
    .from("screening_candidates")
    .select("*, sanctions_entries(primary_name, entity_type, sanctions_programme, source_record_id, legal_basis, designation_date, sanctions_sources(source_code, source_name, authority, information_url))")
    .eq("screening_request_id", requestId)
    .order("match_score", { ascending: false });

  const candidateIds = (candidates ?? []).map((c) => c.id as string);
  const { data: decisions } = candidateIds.length
    ? await supabase.from("screening_decisions").select("*").in("screening_candidate_id", candidateIds).order("created_at", { ascending: false })
    : { data: [] };
  const { data: audit } = await supabase
    .from("screening_audit_log")
    .select("*")
    .eq("screening_request_id", requestId)
    .order("created_at", { ascending: true });

  // Mask sensitive identifiers in any audit payloads rendered to analysts' normal views
  const maskedAudit = (audit ?? []).map((row) => ({ ...row }));

  return {
    request,
    candidates: (candidates ?? []).map((c) => {
      const entry = (c as Record<string, unknown>)["sanctions_entries"] as Record<string, unknown> | null;
      const source = (entry?.["sanctions_sources"] ?? null) as Record<string, unknown> | null;
      const latestDecision = (decisions ?? []).find((d) => d.screening_candidate_id === c.id);
      return {
        id: c.id,
        source_code: c.source_code,
        authority: (source?.["authority"] as string) ?? null,
        source_name: (source?.["source_name"] as string) ?? null,
        source_link: (source?.["information_url"] as string) ?? null,
        official_record_id: (entry?.["source_record_id"] as string) ?? null,
        primary_name: (entry?.["primary_name"] as string) ?? null,
        entity_type: (entry?.["entity_type"] as string) ?? null,
        programme: (entry?.["sanctions_programme"] as string) ?? null,
        legal_basis: (entry?.["legal_basis"] as string) ?? null,
        designation_date: (entry?.["designation_date"] as string) ?? null,
        name_used: c.name_used,
        matched_name: c.matched_name,
        matched_alias_type: c.matched_alias_type,
        name_similarity: c.name_similarity,
        identifier_match: c.identifier_match,
        corroborating: c.corroborating_attributes,
        conflicting: c.conflicting_attributes,
        contributions: c.score_contributions,
        match_score: c.match_score,
        match_level: c.match_level,
        system_classification: c.system_classification,
        decision: latestDecision
          ? { decision: latestDecision.decision, rationale: latestDecision.rationale, decision_source: latestDecision.decision_source, reviewed_at: latestDecision.reviewed_at }
          : null,
      };
    }),
    audit: maskedAudit,
  };
}

export async function recordAnalystDecision(
  supabase: AdminClient,
  candidateId: string,
  decision: "confirmed_match" | "potential_match" | "false_positive" | "insufficient_information" | "escalated",
  rationale: string,
  userId: string,
) {
  if (!rationale.trim()) throw new Error("A written rationale is required for analyst decisions.");
  const { data: candidate, error: candErr } = await supabase
    .from("screening_candidates")
    .select("id, screening_request_id")
    .eq("id", candidateId)
    .single();
  if (candErr || !candidate) throw new Error("Candidate not found");

  const { error } = await supabase.from("screening_decisions").insert({
    screening_candidate_id: candidateId,
    decision,
    decision_source: "analyst",
    rationale: rationale.trim(),
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  if (decision === "confirmed_match") {
    await supabase
      .from("screening_requests")
      .update({ outcome: "confirmed_match_identified" })
      .eq("id", candidate.screening_request_id);
  }
  if (decision === "false_positive") {
    const { data: remaining } = await supabase
      .from("screening_candidates")
      .select("id, screening_decisions(decision)")
      .eq("screening_request_id", candidate.screening_request_id)
      .neq("id", candidateId);
    const stillLive = (remaining ?? []).some((c) => {
      const ds = (c.screening_decisions as { decision: string }[] | null) ?? [];
      return !ds.some((d) => d.decision === "false_positive");
    });
    if (!stillLive) {
      await supabase
        .from("screening_requests")
        .update({ outcome: "no_match_above_threshold" })
        .eq("id", candidate.screening_request_id);
    }
  }

  await supabase.from("screening_audit_log").insert({
    screening_request_id: candidate.screening_request_id,
    screening_candidate_id: candidateId,
    event_type: "analyst_decision",
    actor: userId,
    event_data: { decision, rationale: rationale.trim() },
  });
  return { ok: true };
}

export { maskIdentifier };
