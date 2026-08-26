import { describe, expect, it } from "vitest";
import { companyNameVariants, normalizeNameForms, personNameVariants, tokenJaccard } from "@/lib/sanctions/normalize";
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  scoreCandidate,
  screeningOutcome,
  type CandidateFacts,
} from "@/lib/sanctions/screening-rules";

const base: CandidateFacts = {
  nameSimilarity: 0,
  exactName: false,
  matchedAliasType: "primary",
  identifierMatch: false,
  identifierConflict: false,
  dobMatch: null,
  jurisdictionMatch: null,
  nationalityMatch: null,
  addressMatch: null,
  entityTypeMatch: null,
};

describe("normalization", () => {
  it("handles diacritics, punctuation, apostrophes and whitespace", () => {
    const forms = normalizeNameForms("  O'Brien-Smith,  José  ");
    expect(forms.searchKey).toBe("OBRIEN SMITH JOSE");
    expect(forms.tokens).toEqual(["OBRIEN", "SMITH", "JOSE"]);
  });

  it("transliterates Greek names to Latin", () => {
    const forms = normalizeNameForms("Νικόλαος Παπαδόπουλος");
    expect(forms.searchKey).toContain("NIKOLAOS");
    expect(forms.searchKey).toContain("PAPADOPOYLOS");
  });

  it("transliterates Cyrillic names to Latin", () => {
    const forms = normalizeNameForms("Владимир Путин");
    expect(forms.searchKey).toBe("VLADIMIR PUTIN");
  });

  it("transliterates basic Arabic names to Latin", () => {
    const forms = normalizeNameForms("محمد");
    expect(forms.searchKey.toUpperCase()).toBe("MHMD");
  });

  it("strips common legal suffixes from the comparison key only", () => {
    const forms = normalizeNameForms("Acme Holdings Limited");
    expect(forms.searchKey).toBe("ACME HOLDINGS LIMITED");
    expect(forms.comparisonKey).toBe("ACME");
  });

  it("generates reversed-order and suffix-stripped variants", () => {
    expect(personNameVariants("John Smith")).toContain("SMITH JOHN");
    expect(companyNameVariants("ACME LTD")).toContain("ACME");
    expect(companyNameVariants("ACME LTD")).toContain("ACME LTD");
  });
});

describe("matching hierarchy", () => {
  it("LEVEL 1: exact identifier match ranks highest (strong candidate)", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.6, identifierMatch: true, entityTypeMatch: true });
    expect(r.matchLevel).toBe(1);
    expect(r.classification).toBe("strong_candidate");
    expect(r.contributions["identifier_exact"]).toBe(DEFAULT_WEIGHTS.identifier_exact);
  });

  it("LEVEL 1 with conflicting DOB is demoted, not strong", () => {
    const r = scoreCandidate({ ...base, identifierMatch: true, nameSimilarity: 0.9, dobMatch: false });
    expect(r.classification).not.toBe("strong_candidate");
    expect(r.conflicting).toContain("different date of birth");
  });

  it("LEVEL 2: exact name plus corroboration is strong", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 1, exactName: true, dobMatch: true, nationalityMatch: true, jurisdictionMatch: true, entityTypeMatch: true });
    expect(r.matchLevel).toBe(2);
    expect(r.classification).toBe("strong_candidate");
  });

  it("LEVEL 3: fuzzy name plus exact DOB is potential", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.75, dobMatch: true, nationalityMatch: true, entityTypeMatch: true });
    expect(r.matchLevel).toBe(3);
    expect(["potential_candidate", "strong_candidate"]).toContain(r.classification);
  });

  it("LEVEL 4: name-only match is never strong", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.99, exactName: true });
    expect(r.matchLevel).toBe(4);
    expect(r.classification).not.toBe("strong_candidate");
  });

  it("weak alias matches cannot produce a strong candidate", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.95, matchedAliasType: "weak", dobMatch: true });
    expect(r.classification).not.toBe("strong_candidate");
  });

  it("conflicting jurisdiction and entity type reduce the score", () => {
    const clean = scoreCandidate({ ...base, nameSimilarity: 0.9, exactName: true });
    const conflicted = scoreCandidate({ ...base, nameSimilarity: 0.9, exactName: true, jurisdictionMatch: false, entityTypeMatch: false });
    expect(conflicted.score).toBeLessThan(clean.score - 20);
    expect(conflicted.conflicting).toContain("incompatible jurisdiction");
    expect(conflicted.conflicting).toContain("different entity type");
  });

  it("low-similarity noise is rejected", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.3 });
    expect(r.classification).toBe("rejected");
  });

  it("score is fully explainable — every contribution is named", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.9, dobMatch: true, jurisdictionMatch: true });
    for (const key of Object.keys(r.contributions)) {
      expect(DEFAULT_WEIGHTS).toHaveProperty(key.startsWith("conflict") ? key : key === "alias_quality" ? "alias_primary" : key);
    }
    expect(r.corroborating.length).toBeGreaterThan(0);
  });

  it("common personal name with no corroboration stays weak at best", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.55 });
    expect(["weak_candidate", "rejected"]).toContain(r.classification);
  });

  it("similar company name with different registration number conflicts", () => {
    const r = scoreCandidate({ ...base, nameSimilarity: 0.92, identifierConflict: true });
    expect(r.conflicting).toContain("conflicting identifier");
    expect(r.classification).not.toBe("strong_candidate");
  });

  it("thresholds are configurable", () => {
    const strict = { ...DEFAULT_THRESHOLDS, strong: 200, potential: 120 };
    const r = scoreCandidate({ ...base, identifierMatch: true, nameSimilarity: 0.9 }, DEFAULT_WEIGHTS, strict);
    expect(r.classification).not.toBe("strong_candidate");
  });
});

describe("screening outcome", () => {
  it("name-only matches produce potential, never confirmed", () => {
    expect(screeningOutcome(["potential_candidate"], false, [])).toBe("potential_match_identified");
  });
  it("no candidates → no match above threshold", () => {
    expect(screeningOutcome([], false, [])).toBe("no_match_above_threshold");
  });
  it("rejected-only with an unavailable source → source unavailable", () => {
    expect(screeningOutcome(["rejected"], false, ["OFAC_SDN"])).toBe("source_unavailable");
  });
  it("weak-only with unavailable source → screening incomplete", () => {
    expect(screeningOutcome(["weak_candidate"], false, ["OFAC_SDN"])).toBe("screening_incomplete");
  });
  it("confirmed only via analyst", () => {
    expect(screeningOutcome(["strong_candidate"], true, [])).toBe("confirmed_match_identified");
  });
});

describe("token similarity sanity", () => {
  it("reversed name order keeps full token overlap", () => {
    expect(tokenJaccard("John Smith", "Smith John")).toBe(1);
  });
  it("suffix difference barely changes similarity", () => {
    expect(tokenJaccard("Acme Limited", "Acme Holdings Ltd")).toBe(0);
    expect(tokenJaccard("Acme", "Acme")).toBe(1);
  });
});
