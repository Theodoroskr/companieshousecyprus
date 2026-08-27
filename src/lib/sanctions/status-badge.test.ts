import { describe, expect, it } from "vitest";
import {
  snapshotCandidateStatus,
  statusForSnapshotBadge,
} from "@/lib/sanctions/status-system";

describe("statusForSnapshotBadge", () => {
  it("never shows no_matches when the report holds live candidates", () => {
    // Regression: a delivered order whose snapshot contains a strong OFAC
    // candidate must not badge as "No matches identified".
    const snapshot = {
      outcome: "no_entity_matches_identified",
      runs: [
        {
          candidates: [
            {
              classification: "potential_candidate",
              nameSimilarity: 1,
              identifierMatch: false,
              conflicting: [],
              analystDecision: null,
            },
          ],
        },
      ],
    };
    expect(statusForSnapshotBadge("delivered", snapshot)).toBe("strong_entity_match");
  });

  it("shows analyst_review_pending while an undecided candidate awaits review", () => {
    const snapshot = {
      outcome: "potential_entity_match_identified",
      runs: [
        {
          candidates: [
            {
              classification: "potential_candidate",
              nameSimilarity: 1,
              identifierMatch: false,
              conflicting: [],
              analystDecision: null,
            },
          ],
        },
      ],
    };
    expect(statusForSnapshotBadge("awaiting_review", snapshot)).toBe("analyst_review_pending");
  });

  it("maps workflow states without a snapshot", () => {
    expect(statusForSnapshotBadge("failed", null)).toBe("screening_incomplete");
    expect(statusForSnapshotBadge("withdrawn", null)).toBe("withdrawn");
    expect(statusForSnapshotBadge("pending", null)).toBe("processing");
  });

  it("derives the outcome from a stored screening_outcome string", () => {
    expect(
      statusForSnapshotBadge("delivered", { outcome: "no_entity_matches_identified" }),
    ).toBe("no_matches_identified");
    expect(
      statusForSnapshotBadge("delivered", { outcome: "confirmed_entity_match_identified" }),
    ).toBe("confirmed_entity_match");
  });

  it("falls back to the fulfilment mapping when no outcome is stored", () => {
    expect(statusForSnapshotBadge("delivered", null)).toBe("no_matches_identified");
  });
});

describe("snapshotCandidateStatus", () => {
  it("promotes an exact legal-name match to strong", () => {
    expect(
      snapshotCandidateStatus({
        classification: "potential_candidate",
        nameSimilarity: 1,
        identifierMatch: false,
        conflicting: [],
        analystDecision: null,
      }),
    ).toBe("strong_entity_match");
  });
});
