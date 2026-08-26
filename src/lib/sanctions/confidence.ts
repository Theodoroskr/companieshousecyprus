/**
 * Customer-facing confidence banding for a screening candidate.
 *
 * Hard rule: internal numeric match scores and match levels NEVER leave the
 * server and are never shown to a customer. This module derives a qualitative
 * band plus a written rationale from observable, explainable signals only
 * (identifier match, name equivalence, corroborating and conflicting
 * attributes, analyst determination).
 */

export type ConfidenceBand = "high" | "moderate" | "low" | "not_a_match";

export type ConfidenceSignals = {
  /** An official identifier (registration number, LEI, etc.) matched. */
  identifierMatch?: boolean;
  /** Normalised legal names are equivalent. */
  exactName?: boolean;
  /** Corroborating attributes recorded by the engine. */
  matching?: string[];
  /** Conflicting attributes recorded by the engine. */
  conflicting?: string[];
  /** Analyst determination, when one has been issued. */
  analystDecision?: string | null;
};

export type ConfidenceAssessment = {
  band: ConfidenceBand;
  /** Short label, e.g. "High confidence". */
  label: string;
  /** One-line summary of what the band means for the reader. */
  summary: string;
  /** Bullet reasons supporting the band — shown verbatim in the report. */
  reasons: string[];
  /** Bullet reasons that reduce confidence. */
  caveats: string[];
};

const BAND_LABEL: Record<ConfidenceBand, string> = {
  high: "High confidence",
  moderate: "Moderate confidence",
  low: "Low confidence",
  not_a_match: "Not a match",
};

const BAND_SUMMARY: Record<ConfidenceBand, string> = {
  high: "The listed record and the screened company share strong, verifiable identifying features.",
  moderate:
    "The listed record resembles the screened company, but the available identifiers do not settle the question.",
  low: "The similarity is limited and the record is more likely to be a different entity.",
  not_a_match:
    "An analyst reviewed this candidate and determined it is not the screened company.",
};

export function assessConfidence(signals: ConfidenceSignals): ConfidenceAssessment {
  const matching = signals.matching ?? [];
  const conflicting = signals.conflicting ?? [];
  const reasons: string[] = [];
  const caveats: string[] = [];

  if (signals.analystDecision === "false_positive") {
    return {
      band: "not_a_match",
      label: BAND_LABEL.not_a_match,
      summary: BAND_SUMMARY.not_a_match,
      reasons: ["An authorised analyst reviewed the candidate against the official source."],
      caveats: [],
    };
  }

  if (signals.identifierMatch)
    reasons.push("An official identifier recorded by the authority matches the screened company.");
  if (signals.exactName)
    reasons.push("The listed legal name is equivalent to the name screened, after normalisation.");
  else reasons.push("The listed name is similar to, but not identical with, the name screened.");
  for (const m of matching) reasons.push(`Corroborating attribute: ${m}.`);

  for (const c of conflicting) caveats.push(`Conflicting attribute: ${c}.`);
  if (!signals.identifierMatch)
    caveats.push(
      "No official identifier (registration number or equivalent) is published for the listed record, so identity cannot be settled on identifiers alone.",
    );
  if (signals.exactName && !signals.identifierMatch && matching.length < 2)
    caveats.push(
      "Companies in different jurisdictions can share an identical legal name, so an exact name alone is not conclusive.",
    );

  let band: ConfidenceBand;
  if (signals.analystDecision === "confirmed_match") band = "high";
  else if (signals.identifierMatch && conflicting.length === 0) band = "high";
  // An exact legal-name match corroborated by at least two independent
  // attributes (e.g. jurisdiction and entity type) with no conflicts is
  // treated as high confidence even without a published identifier.
  else if (signals.exactName && conflicting.length === 0 && matching.length >= 2) band = "high";
  else if (signals.exactName && conflicting.length === 0) band = "moderate";
  else if (signals.exactName || signals.identifierMatch || matching.length > 0) band = "moderate";
  else band = "low";

  if (conflicting.length > 0 && band === "high") band = "moderate";

  if (signals.analystDecision === "confirmed_match")
    reasons.unshift("An authorised analyst confirmed the identity against the official source.");

  return {
    band,
    label: BAND_LABEL[band],
    summary: BAND_SUMMARY[band],
    reasons,
    caveats,
  };
}
