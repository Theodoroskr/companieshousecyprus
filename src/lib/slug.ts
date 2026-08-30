// Registry slugs are stored uppercase and ID-shaped (e.g. "C4404", "B40076").
// Public company URLs are name-based and canonical, e.g.
// "infocredit-group-limited-he4404"; the registrar number always stays in the
// slug so a page can be resolved without depending on the name.

export function normalizeCompanySlug(input: string): string {
  const raw = (input ?? "").trim().toUpperCase();
  if (!raw) return raw;
  if (raw.includes("-")) {
    const last = raw.split("-").filter(Boolean).pop() ?? raw;
    if (/^[A-Z]{0,2}\d+$/.test(last)) return last;
  }
  return raw;
}

/** Mirrors public.slugify_company_name in Postgres. */
export function slugifyCompanyName(name: string | null | undefined): string {
  return (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Canonical, name-based public URL slug for a company. Mirrors the
 * `companies.canonical_slug` generated column so links built client-side
 * agree with the sitemap and the page's own canonical tag.
 */
export function companyCanonicalSlug(company: {
  slug: string;
  name?: string | null;
  official_no?: string | null;
}): string {
  const id = (company.official_no || company.slug || "").toLowerCase();
  const base = slugifyCompanyName(company.name);
  return base ? `${base}-${id}` : id;
}

/**
 * Registry-key candidates for an incoming URL slug. Covers the ID form
 * ("C4404", "he4404", "HE 4404") including public-prefix → internal-type-code
 * mapping, which is what makes legacy ID URLs resolvable forever.
 */
export function storedSlugCandidates(
  input: string,
  mapKey: (input: string) => string | null,
): string[] {
  const direct = normalizeCompanySlug(input ?? "");
  const mapped = direct ? mapKey(direct) : null;
  return Array.from(new Set([direct, mapped].filter((v): v is string => Boolean(v))));
}

/**
 * The canonical name-based slug a request must be 301-redirected to, or null
 * when the incoming slug is already canonical. Historic name slugs, ID slugs
 * and mixed-case variants all resolve here.
 */
export function canonicalRedirectTarget(
  inputSlug: string,
  company: { slug: string; canonical_slug?: string | null; name?: string | null; official_no?: string | null },
): string | null {
  const canonical = company.canonical_slug || companyCanonicalSlug(company);
  if (!canonical) return null;
  return canonical === inputSlug ? null : canonical;
}
