/**
 * Explainable, rules-based screening score (rules-v1).
 *
 * Every candidate score is a sum of named contributions — no black box.
 * Classification is system-level only (strong / potential / weak / rejected);
 * a confirmed match can only come from an analyst decision or a reliable
 * identifier rule, never from name similarity alone.
 */

export const RULES_VERSION = "rules-v1";

export type ScreeningWeights = {
  name_similarity: number;
  alias_primary: number;
  alias_strong: number;
  alias_weak: number;
  identifier_exact: number;
  dob: number;
  jurisdiction: number;
  nationality: number;
  address: number;
  entity_type: number;
  conflict_dob: number;
  conflict_jurisdiction: number;
  conflict_nationality: number;
  conflict_entity_type: number;
  conflict_identifier: number;
};

export type ScreeningThresholds = {
  strong: number;
  potential: number;
  weak: number;
  min_name_similarity: number;
  max_candidates: number;
};

export const DEFAULT_WEIGHTS: ScreeningWeights = {
  name_similarity: 40,
  alias_primary: 10,
  alias_strong: 6,
  alias_weak: 2,
  identifier_exact: 50,
  dob: 15,
  jurisdiction: 8,
  nationality: 8,
  address: 6,
  entity_type: 4,
  conflict_dob: -25,
  conflict_jurisdiction: -15,
  conflict_nationality: -12,
  conflict_entity_type: -10,
  conflict_identifier: -30,
};

export const DEFAULT_THRESHOLDS: ScreeningThresholds = {
  strong: 85,
  potential: 60,
  weak: 40,
  min_name_similarity: 0.25,
  max_candidates: 100,
};

export type SystemClassification = "strong_candidate" | "potential_candidate" | "weak_candidate" | "rejected";

export type CandidateFacts = {
  nameSimilarity: number; // 0..1 (trigram)
  exactName: boolean;
  matchedAliasType: string | null; // primary | alias | fka | weak
  identifierMatch: boolean;
  identifierConflict: boolean;
  dobMatch: boolean | null; // null = unknown/not comparable
  jurisdictionMatch: boolean | null;
  nationalityMatch: boolean | null;
  addressMatch: boolean | null;
  entityTypeMatch: boolean | null;
};

export type ScoreResult = {
  score: number;
  contributions: Record<string, number>;
  corroborating: string[];
  conflicting: string[];
  matchLevel: 1 | 2 | 3 | 4;
  classification: SystemClassification;
};

export function scoreCandidate(
  facts: CandidateFacts,
  weights: ScreeningWeights = DEFAULT_WEIGHTS,
  thresholds: ScreeningThresholds = DEFAULT_THRESHOLDS,
): ScoreResult {
  const contributions: Record<string, number> = {};
  const corroborating: string[] = [];
  const conflicting: string[] = [];

  // Name similarity (scaled by weight)
  contributions["name_similarity"] = Math.round(facts.nameSimilarity * weights.name_similarity * 100) / 100;

  // Alias quality
  const aliasType = (facts.matchedAliasType ?? "primary").toLowerCase();
  if (aliasType === "primary") {
    contributions["alias_quality"] = weights.alias_primary;
    corroborating.push("matched on primary name");
  } else if (aliasType === "weak" || aliasType === "low_quality") {
    contributions["alias_quality"] = weights.alias_weak;
    corroborating.push("matched on weak/low-quality alias");
  } else {
    contributions["alias_quality"] = weights.alias_strong;
    corroborating.push(`matched on strong alias (${aliasType})`);
  }

  // Level 1 — reliable identifier
  if (facts.identifierMatch) {
    contributions["identifier_exact"] = weights.identifier_exact;
    corroborating.push("exact reliable identifier match");
  }

  // Corroboration
  if (facts.dobMatch === true) { contributions["dob"] = weights.dob; corroborating.push("date of birth matches"); }
  if (facts.jurisdictionMatch === true) { contributions["jurisdiction"] = weights.jurisdiction; corroborating.push("jurisdiction matches"); }
  if (facts.nationalityMatch === true) { contributions["nationality"] = weights.nationality; corroborating.push("nationality matches"); }
  if (facts.addressMatch === true) { contributions["address"] = weights.address; corroborating.push("address matches"); }
  if (facts.entityTypeMatch === true) { contributions["entity_type"] = weights.entity_type; corroborating.push("entity type matches"); }

  // Conflicts
  if (facts.dobMatch === false) { contributions["conflict_dob"] = weights.conflict_dob; conflicting.push("different date of birth"); }
  if (facts.jurisdictionMatch === false) { contributions["conflict_jurisdiction"] = weights.conflict_jurisdiction; conflicting.push("incompatible jurisdiction"); }
  if (facts.nationalityMatch === false) { contributions["conflict_nationality"] = weights.conflict_nationality; conflicting.push("conflicting nationality"); }
  if (facts.entityTypeMatch === false) { contributions["conflict_entity_type"] = weights.conflict_entity_type; conflicting.push("different entity type"); }
  if (facts.identifierConflict) { contributions["conflict_identifier"] = weights.conflict_identifier; conflicting.push("conflicting identifier"); }

  const score = Math.round(Object.values(contributions).reduce((a, b) => a + b, 0) * 100) / 100;

  // Matching hierarchy
  const strongCorroboration =
    (facts.dobMatch === true ? 1 : 0) +
    (facts.jurisdictionMatch === true ? 1 : 0) +
    (facts.nationalityMatch === true ? 1 : 0) +
    (facts.addressMatch === true ? 1 : 0);

  let matchLevel: 1 | 2 | 3 | 4;
  if (facts.identifierMatch) matchLevel = 1;
  else if (facts.exactName && strongCorroboration >= 1) matchLevel = 2;
  else if (facts.nameSimilarity >= 0.7 && strongCorroboration >= 1) matchLevel = 3;
  else matchLevel = 4;

  let classification: SystemClassification;
  if (score >= thresholds.strong && matchLevel <= 2) classification = "strong_candidate";
  else if (score >= thresholds.potential) classification = "potential_candidate";
  else if (score >= thresholds.weak) classification = "weak_candidate";
  else classification = "rejected";

  // Hard guards
  if (matchLevel === 4 && classification === "strong_candidate") classification = "potential_candidate";
  if (aliasType === "weak" && classification === "strong_candidate" && !facts.identifierMatch) {
    classification = "potential_candidate"; // weak alias alone never strong
  }
  const hasHardConflict =
    facts.identifierConflict || facts.dobMatch === false || facts.entityTypeMatch === false;
  if (hasHardConflict && facts.identifierMatch && classification === "strong_candidate") {
    classification = "potential_candidate"; // contradictory data demotes even identifier matches
  }

  return { score, contributions, corroborating, conflicting, matchLevel, classification };
}

/** Request-level outcome from the set of system classifications (+ analyst decisions). */
export function screeningOutcome(
  classifications: SystemClassification[],
  analystConfirmed: boolean,
  sourcesUnavailable: string[],
): "confirmed_match_identified" | "potential_match_identified" | "no_match_above_threshold" | "screening_incomplete" | "source_unavailable" {
  if (analystConfirmed) return "confirmed_match_identified";
  const live = classifications.filter((c) => c !== "rejected");
  if (!live.length) {
    if (sourcesUnavailable.length) return "source_unavailable";
    return "no_match_above_threshold";
  }
  if (sourcesUnavailable.length && live.every((c) => c === "weak_candidate")) return "screening_incomplete";
  return "potential_match_identified";
}

/**
 * Auto-confirmation (identifier rule).
 *
 * A candidate is confirmed WITHOUT analyst review only when an official
 * identifier published by the authority (registration number, LEI or
 * equivalent) matches the screened entity exactly and nothing recorded on the
 * listed record contradicts the screened entity. Name similarity alone can
 * never auto-confirm.
 */
export const AUTO_CONFIRM_DECISION_SOURCE = "system_identifier";

export function qualifiesForAutoConfirmation(
  facts: CandidateFacts,
  result: Pick<ScoreResult, "conflicting" | "matchLevel">,
): boolean {
  if (!facts.identifierMatch) return false;
  if (facts.identifierConflict) return false;
  if (result.matchLevel !== 1) return false;
  if (result.conflicting.length > 0) return false;
  if (facts.dobMatch === false) return false;
  if (facts.entityTypeMatch === false) return false;
  if (facts.jurisdictionMatch === false) return false;
  if (facts.nationalityMatch === false) return false;
  return true;
}

export function autoConfirmationRationale(facts: CandidateFacts, corroborating: string[] = []): string {
  const extra = corroborating.filter((c) => c !== "exact reliable identifier match");
  return [
    "Auto-confirmed under the identifier rule: an official identifier published by the authority matches the screened entity exactly,",
    "and no attribute on the listed record conflicts with the screened entity.",
    facts.exactName ? "The listed legal name is also equivalent after normalisation." : "",
    extra.length ? `Corroborating attributes: ${extra.join("; ")}.` : "",
    "No analyst review was required for this determination.",
  ]
    .filter(Boolean)
    .join(" ");
}
