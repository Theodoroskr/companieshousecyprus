import { describe, expect, it } from "vitest";
import {
  canonicalRedirectTarget,
  companyCanonicalSlug,
  normalizeCompanySlug,
  storedSlugCandidates,
} from "@/lib/slug";
import { normaliseCompanyKey } from "@/lib/registrar-mapping";

const mapKey = (v: string) => normaliseCompanyKey("", v)?.slug ?? null;
const candidates = (input: string) => storedSlugCandidates(input, mapKey);

/** A company as stored today. */
const infocredit = {
  slug: "C4404",
  canonical_slug: "infocredit-group-limited-he4404",
  name: "INFOCREDIT GROUP LIMITED",
  official_no: "HE4404",
};

const coffee = {
  slug: "C266206",
  canonical_slug: "coffee-lovers-ltd-he266206",
  name: "COFFEE LOVERS LTD",
  official_no: "HE266206",
};

const partnership = {
  slug: "B40076",
  canonical_slug: "sample-partnership-ee40076",
  name: "Sample Partnership",
  official_no: "EE40076",
};

describe("legacy ID slugs resolve to the stored registry key", () => {
  it("accepts public prefixes, internal codes, casing and spacing", () => {
    for (const input of ["C4404", "c4404", "HE4404", "he4404", "HE 4404", "he-4404"]) {
      expect(candidates(input), input).toContain("C4404");
    }
    // A bare number is ambiguous across registry families: never guessed.
    expect(candidates("4404")).not.toContain("C4404");
  });


  it("maps every registry prefix family to its internal type code", () => {
    expect(candidates("EE40076")).toContain("B40076");
    expect(candidates("AE5")).toContain("O5");
    expect(candidates("BN5")).toContain("N5");
  });

  it("keeps name-based slugs resolvable via their trailing registry id", () => {
    expect(candidates("infocredit-group-limited-he4404")).toContain("C4404");
    expect(candidates("coffee-lovers-ltd-he266206")).toContain("C266206");
    // A previously published name for the same company still carries the id.
    expect(candidates("coffee-lovers-limited-he266206")).toContain("C266206");
  });

  it("passes unknown shapes through for the slug-history lookup", () => {
    // No trailing registry id: nothing to guess, so the DB history RPC decides.
    expect(candidates("some-old-company-name")).toEqual(["SOME-OLD-COMPANY-NAME"]);
  });
});

describe("301 redirect target", () => {
  it("redirects the ID form to the canonical name-based URL", () => {
    expect(canonicalRedirectTarget("C4404", infocredit)).toBe("infocredit-group-limited-he4404");
    expect(canonicalRedirectTarget("he4404", infocredit)).toBe("infocredit-group-limited-he4404");
  });

  it("redirects mixed-case and uppercase canonical variants", () => {
    expect(canonicalRedirectTarget("Infocredit-Group-Limited-HE4404", infocredit)).toBe(
      "infocredit-group-limited-he4404",
    );
  });

  it("redirects a prior (historic) name slug to the current canonical URL", () => {
    // Company renamed: history row resolves to C266206, canonical is the new name.
    expect(canonicalRedirectTarget("coffee-lovers-limited-he266206", coffee)).toBe(
      "coffee-lovers-ltd-he266206",
    );
    expect(canonicalRedirectTarget("old-trading-name-he266206", coffee)).toBe(
      "coffee-lovers-ltd-he266206",
    );
  });

  it("does not redirect a request already on the canonical URL", () => {
    expect(canonicalRedirectTarget("infocredit-group-limited-he4404", infocredit)).toBeNull();
    expect(canonicalRedirectTarget("sample-partnership-ee40076", partnership)).toBeNull();
  });

  it("falls back to the computed canonical slug when the column is missing", () => {
    const legacyRow = { slug: "C4404", name: "INFOCREDIT GROUP LIMITED", official_no: "HE4404" };
    expect(canonicalRedirectTarget("C4404", legacyRow)).toBe(companyCanonicalSlug(legacyRow));
    expect(canonicalRedirectTarget(companyCanonicalSlug(legacyRow), legacyRow)).toBeNull();
  });

  it("never redirects to an empty path", () => {
    expect(canonicalRedirectTarget("", { slug: "", name: null, official_no: null })).toBeNull();
  });
});

describe("redirect chains terminate (slug history is honoured forever)", () => {
  const companies = [infocredit, coffee, partnership];
  const bySlug = new Map(companies.map((c) => [c.slug, c]));

  /** Mirrors resolveStoredSlug: candidates first, then the history lookup. */
  const history = new Map<string, string>([
    ["coffee-lovers-limited-he266206", "C266206"],
    ["old-trading-name-he266206", "C266206"],
    ["renamed-partnership", "B40076"],
  ]);

  function resolve(input: string): string | null {
    for (const candidate of candidates(input)) {
      if (bySlug.has(candidate)) return candidate;
    }
    return history.get(input.trim().toLowerCase()) ?? null;
  }

  const inputs = [
    "C4404",
    "he4404",
    "HE 4404",
    "infocredit-group-limited-he4404",
    "coffee-lovers-limited-he266206",
    "old-trading-name-he266206",
    "renamed-partnership",
    "EE40076",
    "B40076",
  ];

  it("every legacy or historic slug lands on the canonical URL in one hop", () => {
    for (const input of inputs) {
      const stored = resolve(input);
      expect(stored, `unresolved: ${input}`).not.toBeNull();
      const company = bySlug.get(stored!)!;
      const target = canonicalRedirectTarget(input, company) ?? input;
      expect(target).toBe(company.canonical_slug);
      // Second hop must be a no-op: no redirect loops or chains.
      expect(canonicalRedirectTarget(target, company)).toBeNull();
    }
  });

  it("history entries without a registry id still resolve", () => {
    expect(normalizeCompanySlug("renamed-partnership")).toBe("RENAMED-PARTNERSHIP");
    expect(resolve("renamed-partnership")).toBe("B40076");
  });
});

describe("canonical URLs emitted by lists, search and APIs", () => {
  it("prefers the stored canonical_slug over a recomputed one", () => {
    // Postgres transliterates Greek names; the JS fallback must never override it.
    expect(
      companyCanonicalSlug({
        slug: "C4404",
        name: "ΙΝΦΟΚΡΕΝΤΙΤ",
        official_no: "HE4404",
        canonical_slug: "infokredit-he4404",
      }),
    ).toBe("infokredit-he4404");
  });

  it("falls back to name + registry number when canonical_slug is absent", () => {
    expect(
      companyCanonicalSlug({ slug: "C4404", name: "Infocredit Group Limited", official_no: "HE4404" }),
    ).toBe("infocredit-group-limited-he4404");
  });

  it("never emits a bare registry-ID slug when a name is known", () => {
    const slug = companyCanonicalSlug({ slug: "C266206", name: "Coffee Lovers Ltd", official_no: "HE266206" });
    expect(slug).not.toBe("C266206");
    expect(slug).toBe("coffee-lovers-ltd-he266206");
  });

  it("emits the same target a cart-line ID slug would 301 to", () => {
    const linked = companyCanonicalSlug({
      slug: "C266206",
      name: "Coffee Lovers Ltd",
      official_no: "HE266206",
    });
    const company = { slug: "C266206", canonical_slug: "coffee-lovers-ltd-he266206" };
    expect(linked).toBe(canonicalRedirectTarget("C266206", company));
    // and the canonical link itself must not redirect again
    expect(canonicalRedirectTarget(linked, company)).toBeNull();
  });
});
