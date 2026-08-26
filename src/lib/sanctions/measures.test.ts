import { describe, expect, it } from "vitest";
import { extractMeasures, extractMeasuresNote } from "@/lib/sanctions/measures";

describe("measures extraction", () => {
  const uksl = {
    raw: {
      sanctions_imposed: ["Asset freeze", "Trust Services Sanctions", "Director Disqualification Sanction"],
      other_information: "The Director Disqualification Sanction was imposed on 09/04/2025.",
    },
  };

  it("reads UK sanctions imposed", () => {
    expect(extractMeasures(uksl)).toEqual([
      "Asset freeze",
      "Trust Services Sanctions",
      "Director Disqualification Sanction",
    ]);
  });

  it("reads the published note", () => {
    expect(extractMeasuresNote(uksl)).toContain("09/04/2025");
  });

  it("handles string programmes and de-duplicates", () => {
    expect(extractMeasures({ raw: { programs: ["UKRAINE-EO13662", "UKRAINE-EO13662"] } })).toEqual(["UKRAINE-EO13662"]);
    expect(extractMeasures({ programmes: "RUSSIA" })).toEqual(["RUSSIA"]);
  });

  it("returns empty results for missing or malformed records", () => {
    expect(extractMeasures(null)).toEqual([]);
    expect(extractMeasuresNote(undefined)).toBeNull();
    expect(extractMeasures({ raw: { sanctions_imposed: [1, ""] } })).toEqual([]);
  });
});
