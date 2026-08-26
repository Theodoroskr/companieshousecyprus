/**
 * Browser-safe audit trail for a snapshot candidate.
 *
 * It answers three questions in plain language, without exposing any internal
 * numeric score:
 *   1. Which official identifier (if any) matched.
 *   2. Which fields were checked, and what the result of each check was.
 *   3. Whether analyst review was required, and if it was skipped, why.
 */

export type AuditFieldResult = "match" | "conflict" | "not_compared";

export type AuditField = {
  field: string;
  label: string;
  result: AuditFieldResult;
  detail: string;
};

export type MatchedIdentifier = {
  type: string;
  label: string;
  value: string;
  issuer: string | null;
};

export type CandidateAudit = {
  /** Every field the engine compared, with the result of the comparison. */
  fieldsChecked: AuditField[];
  /** Official identifiers published by the authority that matched exactly. */
  matchedIdentifiers: MatchedIdentifier[];
  reviewOutcome: {
    reviewRequired: boolean;
    reviewSkipped: boolean;
    decisionSource: string | null;
    reasons: string[];
    summary: string;
  };
};

export type CandidateAuditInput = {
  nameUsed: string;
  matchedName: string;
  nameSimilarity: number | null;
  identifierMatch: boolean;
  matching: string[];
  conflicting: string[];
  classification: string;
  matchedIdentifiers?: MatchedIdentifier[];
  analystDecision?: {
    decision: string;
    decisionSource?: string | null;
    reviewedAt?: string | null;
  } | null;
};

export const IDENTIFIER_TYPE_LABEL: Record<string, string> = {
  registration_number: "Company registration number",
  reg_number: "Company registration number",
  lei: "Legal Entity Identifier (LEI)",
  vat: "VAT number",
  tax_id: "Tax identification number",
};

export function identifierLabel(type: string): string {
  const key = type.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (
    IDENTIFIER_TYPE_LABEL[key] ??
    key.replace(/_/g, " ").replace(/^./, (ch) => ch.toUpperCase())
  );
}

function has(list: string[], needle: RegExp): boolean {
  return list.some((item) => needle.test(item));
}

export function buildCandidateAudit(input: CandidateAuditInput): CandidateAudit {
  const matching = input.matching ?? [];
  const conflicting = input.conflicting ?? [];
  const matchedIdentifiers = input.matchedIdentifiers ?? [];

  const fieldsChecked: AuditField[] = [];

  // Legal name
  const exactName = (input.nameSimilarity ?? 0) >= 0.98;
  fieldsChecked.push({
    field: "legal_name",
    label: "Legal name",
    result: "match",
    detail: exactName
      ? `“${input.nameUsed}” is equivalent to the listed name “${input.matchedName}” after normalisation.`
      : `“${input.nameUsed}” closely resembles the listed name “${input.matchedName}”, but the two are not identical after normalisation.`,
  });

  // Official identifier
  if (input.identifierMatch && matchedIdentifiers.length) {
    fieldsChecked.push({
      field: "official_identifier",
      label: "Official identifier",
      result: "match",
      detail: matchedIdentifiers
        .map(
          (id) =>
            `${id.label} ${id.value}${id.issuer ? ` (issued in ${id.issuer})` : ""} published on the listed record matches the screened company exactly.`,
        )
        .join(" "),
    });
  } else if (input.identifierMatch) {
    fieldsChecked.push({
      field: "official_identifier",
      label: "Official identifier",
      result: "match",
      detail:
        "An official identifier published on the listed record matches the screened company exactly.",
    });
  } else if (has(conflicting, /identifier/i)) {
    fieldsChecked.push({
      field: "official_identifier",
      label: "Official identifier",
      result: "conflict",
      detail:
        "The listed record publishes an official identifier that differs from the registration number of the screened company.",
    });
  } else {
    fieldsChecked.push({
      field: "official_identifier",
      label: "Official identifier",
      result: "not_compared",
      detail:
        "No official identifier (registration number or equivalent) is published for the listed record, so identifiers could not be compared.",
    });
  }

  // Jurisdiction
  fieldsChecked.push(
    buildTriState(
      "jurisdiction",
      "Jurisdiction",
      has(matching, /jurisdiction/i),
      has(conflicting, /jurisdiction/i),
      "The jurisdiction recorded for the listed record is consistent with Cyprus.",
      "The jurisdiction recorded for the listed record is incompatible with the screened company.",
      "The source publishes no jurisdiction or country for the listed record, so it could not be compared.",
    ),
  );

  // Entity type
  fieldsChecked.push(
    buildTriState(
      "entity_type",
      "Entity type",
      has(matching, /entity type/i),
      has(conflicting, /entity type|record type/i),
      "Both the screened subject and the listed record are legal entities.",
      "The listed record is not recorded as the same class of entity as the screened company.",
      "The record type published by the source is not conclusive for this comparison.",
    ),
  );

  // Address
  fieldsChecked.push(
    buildTriState(
      "address",
      "Registered address",
      has(matching, /address/i),
      has(conflicting, /address/i),
      "The address country on the listed record is consistent with the registered office of the screened company.",
      "The address country on the listed record conflicts with the registered office of the screened company.",
      "No comparable address is published for the listed record.",
    ),
  );

  // Alias quality
  const aliasNote = matching.find((m) => /alias|primary name/i.test(m));
  if (aliasNote) {
    fieldsChecked.push({
      field: "name_record_used",
      label: "Name record used",
      result: "match",
      detail: `The comparison used the ${aliasNote}.`,
    });
  }

  const decisionSource = input.analystDecision?.decisionSource ?? null;
  const autoConfirmed = decisionSource === "system_identifier";
  const analystReviewed = Boolean(input.analystDecision) && !autoConfirmed;

  const reasons: string[] = [];
  let summary: string;
  let reviewRequired: boolean;
  let reviewSkipped: boolean;

  if (autoConfirmed) {
    reviewRequired = false;
    reviewSkipped = true;
    reasons.push(
      matchedIdentifiers.length
        ? `An official identifier published by the authority (${matchedIdentifiers
            .map((id) => `${id.label} ${id.value}`)
            .join(", ")}) matches the screened company exactly.`
        : "An official identifier published by the authority matches the screened company exactly.",
    );
    reasons.push("No attribute recorded on the listed record conflicts with the screened company.");
    reasons.push(
      "Under the identifier rule, identity is settled by the identifier itself, so no analyst judgement is needed.",
    );
    summary =
      "Analyst review was skipped: identity was settled automatically by an exact official identifier match with no conflicting attributes.";
  } else if (analystReviewed) {
    reviewRequired = true;
    reviewSkipped = false;
    reasons.push(
      "No exact official identifier match was available, so the determination was made by an analyst.",
    );
    summary = `Analyst review was completed; the recorded determination is “${(input.analystDecision?.decision ?? "").replace(/_/g, " ")}”.`;
  } else {
    reviewRequired = true;
    reviewSkipped = false;
    reasons.push(
      input.identifierMatch
        ? "An identifier matched, but at least one attribute on the listed record conflicts with the screened company, so the automatic rule does not apply."
        : "No official identifier match was available, and name and attribute evidence alone cannot settle identity.",
    );
    if (conflicting.length)
      reasons.push(`Conflicting attributes recorded: ${conflicting.join("; ")}.`);
    summary =
      "Analyst review is required: the identifier rule for automatic confirmation was not satisfied.";
  }

  return {
    fieldsChecked,
    matchedIdentifiers,
    reviewOutcome: { reviewRequired, reviewSkipped, decisionSource, reasons, summary },
  };
}

function buildTriState(
  field: string,
  label: string,
  matched: boolean,
  conflict: boolean,
  matchDetail: string,
  conflictDetail: string,
  notComparedDetail: string,
): AuditField {
  if (conflict) return { field, label, result: "conflict", detail: conflictDetail };
  if (matched) return { field, label, result: "match", detail: matchDetail };
  return { field, label, result: "not_compared", detail: notComparedDetail };
}
