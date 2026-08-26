import { describe, expect, it } from "vitest";
import { buildCandidateAudit } from "./audit-trail";
import { resolveAddressDisplay } from "@/lib/format";

const base = {
  nameUsed: "MERITSERVUS HC LIMITED",
  matchedName: "MERITSERVUS HC LIMITED",
  nameSimilarity: 1,
  identifierMatch: false,
  matching: ["matched on primary name", "jurisdiction matches", "entity type matches"],
  conflicting: [],
  classification: "strong_candidate",
};

describe("audit trail", () => {
  it("explains why review is required when no identifier matched", () => {
    const audit = buildCandidateAudit(base);
    expect(audit.reviewOutcome.reviewSkipped).toBe(false);
    expect(audit.matchedIdentifiers).toHaveLength(0);
    const identifier = audit.fieldsChecked.find((f) => f.field === "official_identifier");
    expect(identifier?.result).toBe("not_compared");
  });

  it("names the identifier that settled an auto-confirmation", () => {
    const audit = buildCandidateAudit({
      ...base,
      identifierMatch: true,
      matchedIdentifiers: [
        { type: "registration_number", label: "Company registration number", value: "HE4404", issuer: "CY" },
      ],
      analystDecision: { decision: "confirmed_match", decisionSource: "system_identifier" },
    });
    expect(audit.reviewOutcome.reviewSkipped).toBe(true);
    expect(audit.reviewOutcome.reasons.join(" ")).toContain("HE4404");
    expect(audit.fieldsChecked.some((f) => f.result === "match")).toBe(true);
  });

  it("flags conflicting identifiers", () => {
    const audit = buildCandidateAudit({
      ...base,
      conflicting: ["conflicting identifier"],
    });
    const identifier = audit.fieldsChecked.find((f) => f.field === "official_identifier");
    expect(identifier?.result).toBe("conflict");
    expect(audit.reviewOutcome.reviewRequired).toBe(true);
  });
});

describe("address fallback", () => {
  it("shows the transliterated line plus the Greek original", () => {
    const d = resolveAddressDisplay({ address_full: "Λεμεσός, 3105, Κύπρος" });
    expect(d?.primary).not.toMatch(/[\u0370-\u03ff]/);
    expect(d?.secondary).toContain("Λεμεσός");
  });

  it("does not duplicate a Latin-only address", () => {
    const d = resolveAddressDisplay({ address_full: "1 Main Street, Nicosia, 1010" });
    expect(d?.secondary).toBeNull();
    expect(d?.primaryLabel).toBe("Registered address");
  });

  it("falls back to components when the full address is malformed", () => {
    const d = resolveAddressDisplay({
      address_full: " , ,, ",
      street: "Makariou III",
      building: "256",
      locality: "Limassol",
      postcode: "3105",
      district_en: "Limassol",
    });
    expect(d?.source).toBe("components");
    expect(d?.primary).toBe("Makariou III, 256, Limassol, 3105, Limassol");
  });

  it("returns null when nothing usable exists", () => {
    expect(resolveAddressDisplay({ address_full: null })).toBeNull();
  });
});
