import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  CONNECTED_INDIVIDUAL_SCREENING_ENABLED,
  CUSTOMER_SCREENABLE_ENTITY_TYPES,
  EXCLUDED_SUBJECT_CATEGORIES,
  FORBIDDEN_OUTCOME_WORDS,
  INDIVIDUALS_EXCLUDED_NOTICE,
  OUTCOME_STATEMENT,
  OUTCOME_TITLE,
  COMPANY_PAGE_COPY,
} from "@/lib/sanctions/screening-scope";
import { aggregateEntityOutcome } from "@/lib/sanctions/screening.server";
import { PRODUCTS } from "@/lib/products";
import { priceBreakdown } from "@/lib/pricing";

describe("launch scope flags", () => {
  it("keeps connected-individual screening disabled", () => {
    expect(CONNECTED_INDIVIDUAL_SCREENING_ENABLED).toBe(false);
  });

  it("only allows entity records into customer screening", () => {
    expect([...CUSTOMER_SCREENABLE_ENTITY_TYPES]).toEqual(["entity"]);
  });

  it("excludes every natural-person category plus vessels and aircraft", () => {
    for (const category of [
      "directors",
      "individual_shareholders",
      "beneficial_owners",
      "secretaries",
      "officers",
      "authorised_representatives",
      "other_natural_persons",
      "vessels",
      "aircraft",
    ]) {
      expect(EXCLUDED_SUBJECT_CATEGORIES).toContain(category);
    }
  });
});

describe("outcomes", () => {
  it("uses only the four permitted outcomes", () => {
    expect(Object.keys(OUTCOME_TITLE)).toEqual([
      "no_entity_matches_identified",
      "potential_entity_match_identified",
      "confirmed_entity_match_identified",
      "screening_incomplete",
    ]);
  });

  it("never uses forbidden reassurance wording", () => {
    const copy = [
      ...Object.values(OUTCOME_TITLE),
      ...Object.values(OUTCOME_STATEMENT),
      INDIVIDUALS_EXCLUDED_NOTICE,
      ...Object.values(COMPANY_PAGE_COPY),
    ]
      .join(" ")
      .toLowerCase();
    for (const word of FORBIDDEN_OUTCOME_WORDS) {
      expect(copy.includes(word)).toBe(false);
    }
  });

  it("aggregates run outcomes conservatively", () => {
    expect(aggregateEntityOutcome(["no_match_above_threshold"], false)).toBe("no_entity_matches_identified");
    expect(aggregateEntityOutcome(["no_match_above_threshold"], true)).toBe("screening_incomplete");
    expect(aggregateEntityOutcome(["potential_match_identified", "no_match_above_threshold"], false)).toBe(
      "potential_entity_match_identified",
    );
    expect(aggregateEntityOutcome(["confirmed_match_identified"], true)).toBe("confirmed_entity_match_identified");
    expect(aggregateEntityOutcome(["source_unavailable"], false)).toBe("screening_incomplete");
  });
});

describe("Sanctions Risk Snapshot product", () => {
  const product = PRODUCTS.find((p) => p.slug === "sanctions-risk-snapshot")!;

  it("is priced at €29 excluding VAT with no certificate service fee", () => {
    const breakdown = priceBreakdown(product);
    expect(product.price).toBe(29);
    expect(breakdown.serviceFee).toBe(0);
    expect(breakdown.vat).toBeCloseTo(5.51, 2);
  });

  it("states the entity-only limitation and never claims connected persons are checked", () => {
    const copy = product.description.join(" ");
    expect(copy).toContain("Legal entities only. Directors, individual shareholders and other natural persons are not screened in this version.");
    expect(copy.toLowerCase()).not.toContain("connected person");
    expect(copy).toContain("previous names and available corporate shareholders");
  });
});

describe("codebase guarantees", () => {
  const screeningServer = readFileSync("src/lib/sanctions/screening.server.ts", "utf8");
  const snapshotServer = readFileSync("src/lib/sanctions/snapshot.server.ts", "utf8");
  const snapshotView = readFileSync("src/components/report/SanctionsSnapshotView.tsx", "utf8");

  it("does not screen officials/directors from the register", () => {
    expect(screeningServer).not.toMatch(/from\(["']officials["']\)/);
  });

  it("filters candidate records by allowed entry types", () => {
    expect(screeningServer).toContain("allowedEntryTypes");
  });

  it("keeps personal identifiers out of the customer snapshot payload", () => {
    for (const field of ["date_of_birth", "dateOfBirth", "nationality", "passport", "identificationNumber"]) {
      expect(snapshotServer).not.toContain(field);
      expect(snapshotView).not.toContain(field);
    }
  });

  it("re-applies the entity-type safeguard when building the customer payload", () => {
    expect(snapshotServer).toContain("CUSTOMER_VISIBLE_RECORD_TYPES");
  });
});
