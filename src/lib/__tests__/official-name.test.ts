import { describe, expect, it } from "vitest";
import { greekToLatin, officialNameDisplay } from "@/lib/format";

describe("greekToLatin for personal names", () => {
  it("keeps ALL-CAPS registry names fully upper-case", () => {
    expect(greekToLatin("ΘΕΟΔΩΡΟΥ")).toBe("THEODOROU");
    expect(greekToLatin("ΧΡΙΣΤΟΔΟΥΛΟΥ")).toBe("CHRISTODOULOU");
    expect(greekToLatin("ΨΑΡΑΣ")).toBe("PSARAS");
  });

  it("applies ELOT-743 digraphs", () => {
    expect(greekToLatin("ΜΠΑΜΠΗΣ")).toBe("BABIS");
    expect(greekToLatin("ΝΤΙΝΟΣ")).toBe("NTINOS");
    expect(greekToLatin("ΓΕΩΡΓΙΟΥ")).toBe("GEORGIOU");
  });

  it("handles mixed case and final sigma", () => {
    expect(greekToLatin("Ανδρέας")).toBe("Andreas");
    expect(greekToLatin("Κώστας")).toBe("Kostas");
  });

  it("leaves Latin-script names untouched", () => {
    expect(greekToLatin("JOHN SMITH")).toBe("JOHN SMITH");
  });
});

describe("officialNameDisplay", () => {
  it("returns the Latin form with the Greek original alongside", () => {
    expect(officialNameDisplay("ΑΝΔΡΕΑΣ ΘΕΟΔΩΡΟΥ")).toEqual({
      primary: "ANDREAS THEODOROU",
      original: "ΑΝΔΡΕΑΣ ΘΕΟΔΩΡΟΥ",
    });
  });

  it("omits the original when nothing was transliterated", () => {
    expect(officialNameDisplay("  MARIA  PAPA ")).toEqual({ primary: "MARIA PAPA", original: null });
  });

  it("returns null for empty names", () => {
    expect(officialNameDisplay(null)).toBeNull();
    expect(officialNameDisplay("   ")).toBeNull();
  });
});
