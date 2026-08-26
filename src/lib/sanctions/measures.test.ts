import { describe, expect, it } from "vitest";
import {
  extractMeasures,
  extractMeasuresNote,
  measureAvailability,
} from "@/lib/sanctions/measures";

describe("measures extraction", () => {
  const uksl = {
    raw: {
      sanctions_imposed: [
        "Asset freeze",
        "Trust Services Sanctions",
        "Director Disqualification Sanction",
      ],
      other_information: "The Director Disqualification Sanction was imposed on 09/04/2025.",
      last_amended_date: "2025-04-09",
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
    expect(extractMeasures({ raw: { programs: ["UKRAINE-EO13662", "UKRAINE-EO13662"] } })).toEqual([
      "UKRAINE-EO13662",
    ]);
    expect(extractMeasures({ programmes: "RUSSIA" })).toEqual(["RUSSIA"]);
  });

  it("returns empty results for missing or malformed records", () => {
    expect(extractMeasures(null)).toEqual([]);
    expect(extractMeasuresNote(undefined)).toBeNull();
    expect(extractMeasures({ raw: { sanctions_imposed: [1, ""] } })).toEqual([]);
  });

  describe("measureAvailability", () => {
    it("returns present when measures, note or amendment date exist", () => {
      expect(measureAvailability(uksl)).toBe("present");
      expect(measureAvailability({ raw: { last_amended_date: "2025-04-09" } })).toBe("present");
      expect(
        measureAvailability({ raw: { other_information: "Listed under Russia regime." } }),
      ).toBe("present");
    });

    it("returns not_published when the raw record exists but carries no measure fields", () => {
      expect(
        measureAvailability({
          raw: { primary_name: "Meritservus HC Limited", designation_date: "2023-04-11" },
        }),
      ).toBe("not_published");
    });

    it("returns record_missing when no raw record can be loaded", () => {
      expect(measureAvailability(null)).toBe("record_missing");
      expect(measureAvailability(undefined)).toBe("record_missing");
      expect(measureAvailability({})).toBe("record_missing");
    });
  });
});
