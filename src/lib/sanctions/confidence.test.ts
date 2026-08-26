import { describe, expect, it } from "vitest";
import { assessConfidence } from "@/lib/sanctions/confidence";
import { statusForClassification } from "@/lib/sanctions/status-system";

describe("assessConfidence", () => {
  it("returns not_a_match after an analyst false positive", () => {
    expect(assessConfidence({ analystDecision: "false_positive" }).band).toBe("not_a_match");
  });
  it("is high when an identifier matches with no conflicts", () => {
    const a = assessConfidence({ identifierMatch: true, exactName: true });
    expect(a.band).toBe("high");
    expect(a.reasons.length).toBeGreaterThan(0);
  });
  it("downgrades to moderate when attributes conflict", () => {
    expect(assessConfidence({ identifierMatch: true, conflicting: ["jurisdiction"] }).band).toBe(
      "moderate",
    );
  });
  it("is moderate on exact name only and explains the uncertainty", () => {
    const a = assessConfidence({ exactName: true });
    expect(a.band).toBe("moderate");
    expect(a.caveats.join(" ")).toContain("identical legal name");
  });
  it("is low with no identifying corroboration", () => {
    expect(assessConfidence({}).band).toBe("low");
  });
});

describe("statusForClassification", () => {
  it("auto-confirms on identifier match without conflicts", () => {
    expect(
      statusForClassification("potential_candidate", null, { identifierMatch: true }),
    ).toBe("auto_confirmed_entity_match");
  });
  it("keeps analyst pending statuses for name-only matches", () => {
    expect(statusForClassification("strong_candidate", null, {})).toBe("strong_entity_match");
  });
  it("marks analyst false positives as not a match", () => {
    expect(statusForClassification("strong_candidate", "false_positive")).toBe(
      "reviewed_not_confirmed",
    );
  });
});
