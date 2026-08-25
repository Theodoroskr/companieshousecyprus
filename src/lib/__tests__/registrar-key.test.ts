import { describe, it, expect } from "vitest";
import { normaliseCompanyKey, mapOfficialRow } from "@/lib/registrar-mapping";
describe("normaliseCompanyKey", () => {
  it("maps variants", () => {
    for (const [c, n] of [["C","266225"],["HE","266225"],["","HE266225"],["HE","HE 266 225"],["ΗΕ","266225"],["C","0266225"]] as const) {
      expect(normaliseCompanyKey(c, n)?.slug).toBe("C266225");
    }
    expect(normaliseCompanyKey("EE","123")?.slug).toBe("B123");
    expect(normaliseCompanyKey("AE","5")?.slug).toBe("O5");
    expect(normaliseCompanyKey("BN","5")?.slug).toBe("N5");
    expect(normaliseCompanyKey("X","5")).toBeNull();
  });
  it("official row", () => {
    expect(mapOfficialRow({ ORGANISATION_TYPE_CODE: "HE", REGISTRATION_NO: "266225", PERSON_OR_ORGANISATION_NAME: "A B", OFFICIAL_POSITION: "" })?.slug).toBe("C266225");
  });
});
