import { describe, expect, it } from "vitest";
import { greekToLatin, isPredominantlyLatin, normalizeHomoglyphs, officialNameDisplay, searchVariants } from "@/lib/format";

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

  it("uses predominantly-English names exactly as registered, without transliteration", () => {
    // Stray Greek homoglyph Η inside an English name must not be rewritten.
    expect(greekToLatin("TCKΗ HOLDING LTD")).toBe("TCKΗ HOLDING LTD");
    expect(greekToLatin("ΑBC TRADING LTD")).toBe("ΑBC TRADING LTD");
  });

  it("still transliterates predominantly-Greek names containing a Latin suffix", () => {
    expect(greekToLatin("ΠΑΠΑΔΟΠΟΥΛΟΣ LTD")).not.toBe("ΠΑΠΑΔΟΠΟΥΛΟΣ LTD");
  });
});

describe("isPredominantlyLatin", () => {
  it("detects English names with stray Greek homoglyphs", () => {
    expect(isPredominantlyLatin("TCKΗ HOLDING LTD")).toBe(true);
    expect(isPredominantlyLatin("JOHN SMITH")).toBe(true);
  });

  it("rejects genuinely Greek names", () => {
    expect(isPredominantlyLatin("ΑΝΔΡΕΑΣ ΘΕΟΔΩΡΟΥ")).toBe(false);
    expect(isPredominantlyLatin("ΠΑΠΑΔΟΠΟΥΛΟΣ LTD")).toBe(false);
  });
});

describe("normalizeHomoglyphs", () => {
  it("maps Greek look-alikes to Latin capitals", () => {
    expect(normalizeHomoglyphs("TCKΗ HOLDING LTD")).toBe("TCKH HOLDING LTD");
    expect(normalizeHomoglyphs("PLAIN ENGLISH")).toBe("PLAIN ENGLISH");
  });
});

describe("searchVariants", () => {
  it("includes a homoglyph-normalised variant for mixed-script queries", () => {
    const variants = searchVariants("TCKΗ HOLDING LTD");
    expect(variants).toContain("TCKΗ HOLDING LTD");
    expect(variants).toContain("TCKH HOLDING LTD");
  });

  it("still transliterates pure-Greek queries", () => {
    expect(searchVariants("ΤΡΑΠΕΖΑ ΚΥΠΡΟΥ")).toContain("TRAPEZA KYPROU");
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

  it("shows an English name with a Greek homoglyph once, with no duplicate original", () => {
    expect(officialNameDisplay("TCKΗ HOLDING LTD")).toEqual({
      primary: "TCKΗ HOLDING LTD",
      original: null,
    });
  });

  it("returns null for empty names", () => {
    expect(officialNameDisplay(null)).toBeNull();
    expect(officialNameDisplay("   ")).toBeNull();
  });
});
