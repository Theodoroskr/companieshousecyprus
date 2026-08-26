/**
 * Launch scope for customer-facing sanctions screening.
 *
 * Release 1 screens LEGAL ENTITIES ONLY. Individuals (directors, individual
 * shareholders, beneficial owners, secretaries, officers, representatives)
 * are intentionally out of scope for customer screening, matching, reports
 * and public pages — while remaining fully preserved in the official source
 * imports for authorised administrators.
 */

export const SCREENING_SCOPE_VERSION = "entity-only-v1";

/**
 * Connected-individual screening feature flag.
 *
 * Hard-coded false: it is not an admin-editable setting and there is no UI or
 * API to change it. Enabling it is a code change gated on legal approval, a
 * documented lawful basis, a DPIA, privacy-notice update, retention policy,
 * correction/challenge process, analyst-verification workflow and customer
 * access restrictions.
 */
export const CONNECTED_INDIVIDUAL_SCREENING_ENABLED = false as const;

/** Sanctions record types customer screening may compare against. */
export const CUSTOMER_SCREENABLE_ENTITY_TYPES = ["entity"] as const;

export const EXCLUDED_SUBJECT_CATEGORIES = [
  "directors",
  "individual_shareholders",
  "beneficial_owners",
  "secretaries",
  "officers",
  "authorised_representatives",
  "other_natural_persons",
  "vessels",
  "aircraft",
] as const;

export type SubjectRole = "direct_company" | "previous_name" | "corporate_shareholder";

export const SUBJECT_ROLE_LABEL: Record<SubjectRole, string> = {
  direct_company: "Company (current legal name)",
  previous_name: "Previous company name",
  corporate_shareholder: "Corporate shareholder",
};

export type EntityScreeningOutcome =
  | "no_entity_matches_identified"
  | "potential_entity_match_identified"
  | "confirmed_entity_match_identified"
  | "screening_incomplete";

export const OUTCOME_TITLE: Record<EntityScreeningOutcome, string> = {
  no_entity_matches_identified: "No entity matches identified",
  potential_entity_match_identified: "Potential entity match identified",
  confirmed_entity_match_identified: "Confirmed entity match identified",
  screening_incomplete: "Screening incomplete",
};

export const OUTCOME_STATEMENT: Record<EntityScreeningOutcome, string> = {
  no_entity_matches_identified:
    "No entity matches were identified above the configured threshold in the official sources checked at the stated time.",
  potential_entity_match_identified:
    "One or more potential entity matches require further verification. A potential match does not mean that the company is sanctioned.",
  confirmed_entity_match_identified:
    "A reliable matching identifier, or an authorised analyst's confirmation, supports an entity match in the official sources checked.",
  screening_incomplete:
    "One or more sources, company names or corporate entities could not be screened using the information available.",
};

/** Wording that must never describe a screening outcome. */
export const FORBIDDEN_OUTCOME_WORDS = [
  "safe",
  "clear",
  "passed",
  "approved",
  "compliant",
  "clean",
  "risk-free",
  "guaranteed sanctions-free",
] as const;

export const INDIVIDUALS_EXCLUDED_NOTICE =
  "No natural persons were screened as part of this report. Directors, individual shareholders, beneficial owners, secretaries and other natural persons are outside the scope of this version.";

export const SCOPE_LIMITATION_NOTICE =
  "This version does not screen directors, individual shareholders, beneficial owners or other natural persons connected to the company.";

export const SCOPE_SUBJECT_PHRASE = "the company, its previous names and available corporate shareholders.";

export const COMPANY_PAGE_COPY = {
  title: "Sanctions screening",
  description:
    "Screen this company, its previous names and available corporate shareholders against entity records in official EU, UN, UK and US sanctions sources.",
  button: "Run sanctions screening — €29",
  supporting: "Company and legal-entity screening only. Individuals are not included in this version.",
} as const;
