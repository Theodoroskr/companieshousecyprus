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

type AdminClient = Parameters<typeof screenCyprusCompany>[0];

export type SnapshotCandidate = {
  sourceCode: string;
  authority: string | null;
  officialRecordId: string | null;
  recordName: string;
  recordType: string | null;
  programme: string | null;
  legalBasis: string | null;
  designationDate: string | null;
  nameUsed: string;
  matchedName: string;
  nameSimilarity: number | null;
  identifierMatch: boolean;
  matching: string[];
  conflicting: string[];
  matchScore: number;
  matchLevel: number | null;
  classification: string;
  analystDecision: { decision: string; rationale: string; reviewedAt: string | null } | null;
};

export type SnapshotRun = {
  reference: string;
  role: SubjectRole;
  subjectName: string;
  outcome: string;
  candidates: SnapshotCandidate[];
};

export type SanctionsSnapshot = {
  kind: "sanctions_snapshot";
  scopeVersion: string;
  entityOnly: true;
  connectedIndividualScreeningEnabled: false;
  excludedCategories: string[];
  screenedAt: string;
  company: {
    slug: string;
    currentLegalName: string;
    registrationNumber: string | null;
    jurisdiction: string;
    registeredAddress: string | null;
  };
  previousNamesScreened: string[];
  corporateShareholdersScreened: string[];
  notScreened: { subject: string; category: string; reason: string }[];
  sources: { sourceCode: string; importId: string | null; fileHash: string | null }[];
  rulesVersion: string;
  runs: SnapshotRun[];
  outcome: EntityScreeningOutcome;
  outcomeTitle: string;
  outcomeStatement: string;
  limitations: string[];
  individualsExcludedNotice: string;
};

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
          designationDate: c.designation_date,
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
