/**
 * Visual status system for sanctions screening.
 *
 * Rules baked into this module:
 * - Colour NEVER carries meaning on its own: every status ships a written
 *   label, an icon key and (where useful) a short explanation.
 * - No bright green, and no "clear / safe / passed / clean / approved /
 *   compliant / risk-free" wording. A completed screening with no candidate
 *   is teal and reads "No matches identified".
 * - The same keys are used on the company product page, checkout status,
 *   customer result page, PDF report, customer account, admin order view,
 *   the analyst workbench and the verification page.
 */

export type ScreeningStatusKey =
  | "no_matches_identified"
  | "potential_entity_match"
  | "strong_entity_match"
  | "confirmed_entity_match"
  | "screening_incomplete"
  | "source_unavailable"
  | "processing"
  | "analyst_review_pending"
  | "reviewed_not_confirmed"
  | "withdrawn";

export type ScreeningIconKey =
  | "shield-check"
  | "search"
  | "triangle-alert"
  | "octagon-alert"
  | "info"
  | "cloud-off"
  | "clock"
  | "user-check"
  | "circle-check"
  | "circle-minus";

export type ScreeningStatusStyle = {
  /** Written label — always rendered. */
  label: string;
  /** Optional one-line explanation shown under banners. */
  explanation?: string;
  icon: ScreeningIconKey;
  /** Static Tailwind classes (token-backed). */
  text: string;
  bg: string;
  border: string;
  /** Left status border for banners and candidate cards. */
  leftBorder: string;
};

export const SCREENING_STATUS: Record<ScreeningStatusKey, ScreeningStatusStyle> = {
  no_matches_identified: {
    label: "No matches identified",
    explanation:
      "No entity records were returned above the configured threshold in the official sources checked at the stated time.",
    icon: "shield-check",
    text: "text-screening-nomatch",
    bg: "bg-screening-nomatch-bg",
    border: "border-screening-nomatch/40",
    leftBorder: "border-l-4 border-l-screening-nomatch",
  },
  potential_entity_match: {
    label: "Potential entity match",
    explanation:
      "A candidate record shares identifying features with the company and requires further verification.",
    icon: "search",
    text: "text-screening-potential",
    bg: "bg-screening-potential-bg",
    border: "border-screening-potential/40",
    leftBorder: "border-l-4 border-l-screening-potential",
  },
  strong_entity_match: {
    label: "Strong entity match — review required",
    explanation: "Analyst review is required before a final identity determination is issued.",
    icon: "triangle-alert",
    text: "text-screening-strong",
    bg: "bg-screening-strong-bg",
    border: "border-screening-strong/40",
    leftBorder: "border-l-4 border-l-screening-strong",
  },
  confirmed_entity_match: {
    label: "Confirmed direct entity match",
    explanation:
      "A reliable matching identifier, or an authorised analyst's confirmation, supports an entity match in the official sources checked.",
    icon: "octagon-alert",
    text: "text-screening-confirmed",
    bg: "bg-screening-confirmed-bg",
    border: "border-screening-confirmed/40",
    leftBorder: "border-l-4 border-l-screening-confirmed",
  },
  screening_incomplete: {
    label: "Screening incomplete",
    explanation:
      "One or more sources, company names or corporate entities could not be screened using the information available.",
    icon: "info",
    text: "text-screening-incomplete",
    bg: "bg-screening-incomplete-bg",
    border: "border-screening-incomplete/40",
    leftBorder: "border-l-4 border-l-screening-incomplete",
  },
  source_unavailable: {
    label: "Source unavailable",
    explanation: "An official source could not be reached at screening time.",
    icon: "cloud-off",
    text: "text-screening-unavailable",
    bg: "bg-screening-unavailable-bg",
    border: "border-screening-unavailable/40",
    leftBorder: "border-l-4 border-l-screening-unavailable",
  },
  processing: {
    label: "Screening in progress",
    explanation: "The company is being screened against the official sources.",
    icon: "clock",
    text: "text-screening-processing",
    bg: "bg-screening-processing-bg",
    border: "border-screening-processing/40",
    leftBorder: "border-l-4 border-l-screening-processing",
  },
  analyst_review_pending: {
    label: "Analyst review pending",
    explanation: "A candidate has been identified and is with our analysts for identity verification.",
    icon: "user-check",
    text: "text-screening-review",
    bg: "bg-screening-review-bg",
    border: "border-screening-review/40",
    leftBorder: "border-l-4 border-l-screening-review",
  },
  reviewed_not_confirmed: {
    label: "Candidate reviewed — identity not confirmed",
    explanation: "An analyst reviewed the candidate and could not confirm that it is the same legal entity.",
    icon: "circle-check",
    text: "text-screening-nomatch",
    bg: "bg-screening-nomatch-bg",
    border: "border-screening-nomatch/40",
    leftBorder: "border-l-4 border-l-screening-nomatch",
  },
  withdrawn: {
    label: "Report withdrawn",
    explanation: "This report has been withdrawn and should no longer be relied on.",
    icon: "circle-minus",
    text: "text-screening-withdrawn",
    bg: "bg-screening-withdrawn-bg",
    border: "border-screening-withdrawn/40",
    leftBorder: "border-l-4 border-l-screening-withdrawn",
  },
};

/** Source-check statuses used in the "Official sources checked" table. */
export type SourceStatusKey =
  | "checked_no_candidate"
  | "checked_candidate"
  | "checked_confirmed"
  | "stale"
  | "unavailable"
  | "updating";

export const SOURCE_STATUS: Record<SourceStatusKey, { label: string; status: ScreeningStatusKey }> = {
  checked_no_candidate: { label: "Checked — no candidate", status: "no_matches_identified" },
  checked_candidate: { label: "Checked — candidate identified", status: "strong_entity_match" },
  checked_confirmed: { label: "Checked — confirmed match", status: "confirmed_entity_match" },
  stale: { label: "Source stale", status: "potential_entity_match" },
  unavailable: { label: "Source unavailable", status: "source_unavailable" },
  updating: { label: "Updating", status: "processing" },
};

/** Map a system candidate classification to a customer-facing status. */
export function statusForClassification(
  classification: string,
  analystDecision?: string | null,
): ScreeningStatusKey {
  if (analystDecision === "confirmed_match") return "confirmed_entity_match";
  if (analystDecision === "false_positive") return "reviewed_not_confirmed";
  if (classification === "strong_candidate") return "strong_entity_match";
  if (classification === "potential_candidate" || classification === "weak_candidate")
    return "potential_entity_match";
  return "no_matches_identified";
}

/** Map an aggregate screening outcome to a customer-facing status. */
export function statusForOutcome(
  outcome: string,
  options?: { hasStrongCandidate?: boolean },
): ScreeningStatusKey {
  switch (outcome) {
    case "confirmed_entity_match_identified":
    case "confirmed_match_identified":
      return "confirmed_entity_match";
    case "potential_entity_match_identified":
    case "potential_match_identified":
      return options?.hasStrongCandidate ? "strong_entity_match" : "potential_entity_match";
    case "screening_incomplete":
      return "screening_incomplete";
    case "source_unavailable":
      return "source_unavailable";
    case "no_entity_matches_identified":
    case "no_match_above_threshold":
      return "no_matches_identified";
    default:
      return "processing";
  }
}

/** Fulfilment states of the snapshot product mapped onto the same system. */
export function statusForFulfilment(state: string | null | undefined): ScreeningStatusKey {
  switch (state) {
    case "awaiting_review":
      return "analyst_review_pending";
    case "withdrawn":
    case "refunded":
      return "withdrawn";
    case "failed":
      return "screening_incomplete";
    case "delivered":
      return "no_matches_identified";
    default:
      return "processing";
  }
}
