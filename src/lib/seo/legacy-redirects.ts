/**
 * Legacy registry URL → canonical landing page redirects.
 *
 * The previous WordPress site published a wide set of registry-themed URLs
 * (category archives, plural/singular variants, /en/ locale prefixes, index
 * pages) that Google still holds. Each one maps permanently (301) onto the
 * canonical landing page that now owns the term, so link equity lands on a
 * single indexable URL instead of a 404.
 *
 * Guarded by src/lib/__tests__/legacy-redirects.test.ts.
 */
import { REGISTRY_LANDINGS, registryLandingPath, SITE_URL } from "@/lib/seo/registry-landings";
import { STATIC_PAGES } from "@/lib/seo/site-pages";

export type LegacyRedirect = {
  /** Canonical destination path on this site. */
  target: string;
  /** 301 for retired URLs, 302 only for intentionally temporary moves. */
  status: 301 | 302;
};

const landing = (slug: string): string => {
  const entry = REGISTRY_LANDINGS.find((l) => l.slug === slug);
  if (!entry) throw new Error(`Unknown registry landing: ${slug}`);
  return registryLandingPath(entry);
};

/**
 * Legacy path (normalised: lowercase, no trailing slash, no locale prefix)
 * → canonical path. Only permanent moves belong here.
 */
export const LEGACY_REGISTRY_REDIRECTS: Record<string, string> = {
  // Company search
  "/company-search": landing("cyprus-company-search"),
  "/companies-search": landing("cyprus-company-search"),
  "/cyprus-company-search": landing("cyprus-company-search"),
  "/search-companies": landing("cyprus-company-search"),
  "/company/search": landing("cyprus-company-search"),
  "/registry/search": landing("cyprus-company-search"),
  "/company-search-cyprus": landing("cyprus-company-search"),

  // Registrar of Companies
  "/registrar": landing("registrar-of-companies-cyprus"),
  "/registrar-of-companies": landing("registrar-of-companies-cyprus"),
  "/cyprus-registrar-of-companies": landing("registrar-of-companies-cyprus"),
  "/department-of-registrar-of-companies": landing("registrar-of-companies-cyprus"),
  "/registrar-of-companies-and-official-receiver": landing("registrar-of-companies-cyprus"),

  // Registration number lookup
  "/registration-number": landing("check-company-registration-number-cyprus"),
  "/company-registration-number": landing("check-company-registration-number-cyprus"),
  "/check-company-registration-number": landing("check-company-registration-number-cyprus"),
  "/he-number": landing("check-company-registration-number-cyprus"),
  "/he-number-lookup": landing("check-company-registration-number-cyprus"),

  // Status check
  "/company-status": landing("cyprus-company-status-check"),
  "/company-status-check": landing("cyprus-company-status-check"),
  "/check-company-status": landing("cyprus-company-status-check"),
  "/active-companies": landing("cyprus-company-status-check"),

  // Registry hub / archives
  "/registry": "/cyprus-companies-registry",
  "/companies-registry": "/cyprus-companies-registry",
  "/cyprus-registry": "/cyprus-companies-registry",
  "/company-registry-cyprus": "/cyprus-companies-registry",
  "/companies": "/cyprus-companies-registry",
  "/category/registry": "/cyprus-companies-registry",
  "/category/companies": "/cyprus-companies-registry",
  "/category/company-search": landing("cyprus-company-search"),

  // Misc legacy WordPress pages
  "/home": "/",
  "/index.php": "/",
  "/index.html": "/",
  "/company-formation": "/company-set-up/",
  "/company-registration": "/guides/register-company-cyprus",
  "/register-a-company": "/guides/register-company-cyprus",
  "/register-company-cyprus": "/guides/register-company-cyprus",
  "/blog": "/guides",
  "/news": "/guides",
  "/prices": "/pricing",
  "/contact-us": "/contact",
  "/about-us": "/about",
  "/faqs": "/faq",
};

/** Normalises an incoming path for map lookup: lowercase, no locale, no trailing slash. */
export function normalizeLegacyPath(pathname: string): string {
  let path = (pathname || "/").trim().toLowerCase();
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep raw path */
  }
  if (!path.startsWith("/")) path = `/${path}`;
  // Strip legacy locale prefixes: /en/company-search, /el/company-search
  path = path.replace(/^\/(en|el|gr)(?=\/|$)/, "");
  // Strip a trailing WordPress pagination segment: /companies/page/3
  path = path.replace(/\/page\/\d+$/, "");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

/**
 * Resolves a legacy registry URL to its canonical destination, preserving the
 * original query string. Returns null when the path is not a known legacy URL
 * or already points at its canonical destination (no redirect loops).
 */
export function legacyRegistryRedirect(pathname: string, search = ""): LegacyRedirect | null {
  const path = normalizeLegacyPath(pathname);
  const target = LEGACY_REGISTRY_REDIRECTS[path];
  if (!target || target === path) return null;
  const query = search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : "";
  return { target: `${target}${query}`, status: 301 };
}

/** Absolute canonical URL for a redirect target (used in tests and tooling). */
export function absoluteTarget(target: string): string {
  return `${SITE_URL}${target.split("?")[0]}`;
}

/** Every canonical destination must be a real, indexable page. */
export function isKnownCanonicalPath(target: string): boolean {
  const path = target.split("?")[0]!;
  return STATIC_PAGES.some((page) => normalizeLegacyPath(page.path) === normalizeLegacyPath(path));
}
