/**
 * Pure helpers for the canonical company URL health check.
 *
 * The check answers two questions for a sample of company records:
 *  1. does the canonical URL `/company/{ID}` return 200 (no redirect, no 404)?
 *  2. is that exact canonical URL present in the sitemap chunk that should list it?
 */

export const SITEMAP_CHUNK_SIZE = 50_000;
export const CANONICAL_ORIGIN = "https://companieshousecyprus.com";

export function canonicalPath(slug: string): string {
  return `/company/${slug}`;
}

export function canonicalUrl(slug: string): string {
  return `${CANONICAL_ORIGIN}${canonicalPath(slug)}`;
}

/** Chunk file that must contain a company, given its 0-based rank in slug order. */
export function chunkIndexForRank(rank: number): number {
  return Math.floor(Math.max(0, rank) / SITEMAP_CHUNK_SIZE);
}

/** Extract every <loc> value from a sitemap XML body. */
export function extractLocs(xml: string): Set<string> {
  const locs = new Set<string>();
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) locs.add(match[1]!);
  return locs;
}

/** Extract the rel=canonical href from an HTML document, if present. */
export function extractCanonicalHref(html: string): string | null {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (!/rel\s*=\s*["']?canonical["']?/i.test(tag)) continue;
    const href = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (href) return href[1]!;
  }
  return null;
}

export type CanonicalIssue =
  | "missing-in-sitemap"
  | "not-200"
  | "redirected"
  | "canonical-mismatch"
  | "fetch-failed"
  | "sitemap-unreachable";

export type CanonicalCheck = {
  slug: string;
  url: string;
  sample: string;
  status: number | null;
  redirectedTo: string | null;
  canonicalHref: string | null;
  expectedChunk: number | null;
  inSitemap: boolean | null;
  issues: CanonicalIssue[];
  ok: boolean;
};

export function evaluateCheck(input: {
  slug: string;
  sample: string;
  status: number | null;
  location: string | null;
  html: string | null;
  fetchError: string | null;
  expectedChunk: number | null;
  inSitemap: boolean | null;
  sitemapError: string | null;
}): CanonicalCheck {
  const issues: CanonicalIssue[] = [];
  const url = canonicalUrl(input.slug);

  if (input.fetchError) issues.push("fetch-failed");
  else if (input.status !== null && input.status >= 300 && input.status < 400) issues.push("redirected");
  else if (input.status !== 200) issues.push("not-200");

  const canonicalHref = input.html ? extractCanonicalHref(input.html) : null;
  if (input.status === 200 && canonicalHref && canonicalHref !== url) issues.push("canonical-mismatch");

  if (input.sitemapError) issues.push("sitemap-unreachable");
  else if (input.inSitemap === false) issues.push("missing-in-sitemap");

  return {
    slug: input.slug,
    url,
    sample: input.sample,
    status: input.status,
    redirectedTo: input.location,
    canonicalHref,
    expectedChunk: input.expectedChunk,
    inSitemap: input.inSitemap,
    issues,
    ok: issues.length === 0,
  };
}
