/** Shared, browser-safe types for the entity-only Sanctions Risk Snapshot. */
import type { EntityScreeningOutcome, SubjectRole } from "@/lib/sanctions/screening-scope";
import type { MeasureAvailability } from "@/lib/sanctions/measures";

export type SnapshotCandidate = {
  sourceCode: string;
  authority: string | null;
  officialRecordId: string | null;
  recordName: string;
  recordType: string | null;
  programme: string | null;
  legalBasis: string | null;
  /** Statement of reasons exactly as published by the designating authority. */
  listingReason: string | null;
  sourceLink: string | null;
  designationDate: string | null;
  /** Date the authority last amended the listed record. */
  lastAmendedDate: string | null;
  /** Restrictive measures published by the authority for the listed record. */
  measures: string[];
  /** Free-text note published with the measures, when available. */
  measuresNote: string | null;
  /** Whether the source record actually carries measure/amendment data. */
  measuresAvailability?: MeasureAvailability;
  nameUsed: string;
  matchedName: string;
  nameSimilarity: number | null;
  identifierMatch: boolean;
  matching: string[];
  conflicting: string[];
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

/**
 * Remove internal identity-scoring fields from a stored snapshot before it
 * leaves the server. Legacy snapshots were persisted with `matchScore` /
 * `matchLevel`; these must never reach the browser, not even as raw JSON.
 */
export function stripInternalScores<T>(snapshot: T): T {
  if (snapshot == null || typeof snapshot !== "object") return snapshot;
  if (Array.isArray(snapshot)) return snapshot.map((v) => stripInternalScores(v)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(snapshot as Record<string, unknown>)) {
    if (
      key === "matchScore" ||
      key === "matchLevel" ||
      key === "match_score" ||
      key === "match_level"
    )
      continue;
    out[key] = stripInternalScores(value);
  }
  return out as T;
}
