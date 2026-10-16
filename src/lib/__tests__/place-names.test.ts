import { describe, it, expect } from "vitest";
import { englishPlaceNames, companySummarySentence } from "@/lib/format";

describe("englishPlaceNames", () => {
  it("uses Nicosia instead of Levkosia", () => {
    expect(englishPlaceNames("Floor 7, 1065, Levkosia, Cyprus")).toBe("Floor 7, 1065, Nicosia, Cyprus");
  });
  it("uses Limassol, Larnaca, Paphos", () => {
    expect(englishPlaceNames("Lemesos, Larnaka, Pafos")).toBe("Limassol, Larnaca, Paphos");
  });
});

describe("companySummarySentence", () => {
  it("states status, number, date and city", () => {
    expect(
      companySummarySentence({ name: "X LTD", status_en: "Registered", type_en: null, officialNo: "HE462660", registration_date: "2024-07-11", district_en: "Nicosia" }),
    ).toBe("X LTD is a registered company in Cyprus, registration number HE462660, registered on 11 July 2024 in Nicosia.");
  });
});
