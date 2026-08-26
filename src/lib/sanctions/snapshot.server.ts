/**
 * Sanctions Risk Snapshot — customer-facing, ENTITY-ONLY screening product.
 *
 * Runs the entity-only screening engine for a Cyprus company and assembles a
 * customer report payload. No natural person is screened, and no personal
 * identifier ever enters the payload.
 */
import {
  CONNECTED_INDIVIDUAL_SCREENING_ENABLED,
  EXCLUDED_SUBJECT_CATEGORIES,
  INDIVIDUALS_EXCLUDED_NOTICE,
  OUTCOME_STATEMENT,
  OUTCOME_TITLE,
  SCREENING_SCOPE_VERSION,
  type EntityScreeningOutcome,
  type SubjectRole,
} from "@/lib/sanctions/screening-scope";
import { SCREENING_SOURCES, screenCyprusCompany, getScreeningResult } from "@/lib/sanctions/screening.server";
import type { SanctionsSnapshot, SnapshotCandidate, SnapshotRun } from "@/lib/sanctions/snapshot";

export type { SanctionsSnapshot, SnapshotCandidate, SnapshotRun } from "@/lib/sanctions/snapshot";

type AdminClient = Parameters<typeof screenCyprusCompany>[0];

/** Records of these classes can never be presented as company matches. */
const CUSTOMER_VISIBLE_RECORD_TYPES = new Set(["entity", "unknown"]);

export async function buildSanctionsSnapshot(
  supabase: AdminClient,
  slug: string,
  userId: string | null,
  options: { previousNames?: string[] } = {},
): Promise<SanctionsSnapshot> {
  const company = await supabase
    .from("companies")
    .select("slug, name, reg_number, official_no, address_full, locality, district_en")
    .eq("slug", slug)
    .maybeSingle();
  if (!company.data) throw new Error(`Company not found: ${slug}`);

  const screening = await screenCyprusCompany(supabase, slug, [...SCREENING_SOURCES], userId, {
    previousNames: options.previousNames ?? [],
    context: "snapshot",
  });

  const runs: SnapshotRun[] = [];
  for (const run of screening.runs) {
    const detail = await getScreeningResult(supabase, run.requestId);
    const candidates = detail.candidates
      // Entity-type safeguard, enforced again at presentation time.
      .filter((c) => CUSTOMER_VISIBLE_RECORD_TYPES.has((c.entity_type as string) ?? "unknown"))
      .map(
        (c): SnapshotCandidate => ({
          sourceCode: c.source_code as string,
          authority: c.authority,
          officialRecordId: c.official_record_id,
          recordName: (c.primary_name as string) ?? (c.matched_name as string),
          recordType: c.entity_type,
          programme: c.programme,
          legalBasis: c.legal_basis,
          listingReason: (c as { listing_reason?: string | null }).listing_reason ?? null,
          sourceLink: c.source_link ?? null,
          designationDate: c.designation_date,
          lastAmendedDate: (c as { last_amended_date?: string | null }).last_amended_date ?? null,
          measures: extractMeasures((c as { raw_record?: unknown }).raw_record),
          measuresNote: extractMeasuresNote((c as { raw_record?: unknown }).raw_record),
          nameUsed: c.name_used as string,
          matchedName: c.matched_name as string,
          nameSimilarity: c.name_similarity as number | null,
          identifierMatch: Boolean(c.identifier_match),
          matching: (c.corroborating as string[] | null) ?? [],
          conflicting: (c.conflicting as string[] | null) ?? [],
          matchScore: Number(c.match_score),
          matchLevel: (c.match_level as number | null) ?? null,
          classification: c.system_classification as string,
          analystDecision: c.decision
            ? { decision: c.decision.decision as string, rationale: c.decision.rationale as string, reviewedAt: (c.decision.reviewed_at as string) ?? null }
            : null,
        }),
      );
    runs.push({ reference: run.reference, role: run.role, subjectName: run.subjectName, outcome: run.outcome, candidates });
  }

  const rootRequest = await supabase
    .from("screening_requests")
    .select("rules_version, source_import_ids, source_file_hashes, requested_at")
    .eq("id", screening.companyRequest.requestId)
    .maybeSingle();

  const importIds = (rootRequest.data?.source_import_ids ?? {}) as Record<string, { importId?: string | null } | null>;
  const hashes = (rootRequest.data?.source_file_hashes ?? {}) as Record<string, string | null>;
  const sources = SCREENING_SOURCES.map((code) => ({
    sourceCode: code,
    importId: importIds?.[code]?.importId ?? null,
    fileHash: hashes?.[code] ?? null,
  }));

  const limitations: string[] = [
    "Screening covers legal entities only: the company, its previous names and available corporate shareholders.",
    "A potential match does not mean that the company is sanctioned; it requires further verification.",
    ...screening.notScreened.map((n) => `${n.subject}: ${n.reason}`),
    ...sources.filter((s) => !s.importId).map((s) => `${s.sourceCode}: no completed source import was available at the time of screening.`),
  ];

  const outcome = screening.overallOutcome;

  return {
    kind: "sanctions_snapshot",
    scopeVersion: SCREENING_SCOPE_VERSION,
    entityOnly: true,
    connectedIndividualScreeningEnabled: CONNECTED_INDIVIDUAL_SCREENING_ENABLED,
    excludedCategories: [...EXCLUDED_SUBJECT_CATEGORIES],
    screenedAt: rootRequest.data?.requested_at ?? new Date().toISOString(),
    company: {
      slug: company.data.slug,
      currentLegalName: company.data.name,
      registrationNumber: company.data.official_no ?? (company.data.reg_number != null ? String(company.data.reg_number) : null),
      jurisdiction: "Cyprus",
      registeredAddress:
        company.data.address_full ?? ([company.data.locality, company.data.district_en].filter(Boolean).join(", ") || null),
    },
    previousNamesScreened: screening.previousNamesScreened,
    corporateShareholdersScreened: screening.corporateShareholdersScreened,
    notScreened: screening.notScreened,
    sources,
    rulesVersion: (rootRequest.data?.rules_version as string) ?? "rules-v1",
    runs,
    outcome,
    outcomeTitle: OUTCOME_TITLE[outcome],
    outcomeStatement: OUTCOME_STATEMENT[outcome],
    limitations,
    individualsExcludedNotice: INDIVIDUALS_EXCLUDED_NOTICE,
  };
}
