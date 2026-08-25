/**
 * Legacy WordPress URL classification.
 *
 * The old platform leaked unrendered template placeholders into pages that
 * Google indexed, e.g.
 *   /company/{{vcompany.name}}-{{vcompany.registration_no}}
 *   /dfd.name/he266225
 *   /company/dfd.name
 *
 * Those URLs must never render normal content. Where the URL still carries a
 * usable registry number we redirect permanently to the new company page;
 * otherwise the URL is retired with 410 Gone so Google drops it.
 */

export type LegacyMatch =
  | { kind: "legacy"; token: string | null }
  | null;

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const TEMPLATE_MARKERS = [
  "{{",
  "}}",
  "vcompany",
  "dfd.name",
  "dfd-name",
];

/** Last registry-id-shaped token in the path, e.g. "c4404", "HE266225". */
export function extractRegistryToken(pathAndQuery: string): string | null {
  const matches = decode(pathAndQuery).toUpperCase().match(/\b([A-Z]{0,2})[\s-]?(\d{3,7})\b/g);
  if (!matches || matches.length === 0) return null;
  const last = matches[matches.length - 1]!.replace(/[\s-]/g, "");
  return /^[A-Z]{0,2}\d{3,7}$/.test(last) ? last : null;
}

/**
 * Returns a legacy match when the URL is one of the retired template-leak
 * shapes. `token` is the registry id that can be resolved to a live page.
 */
export function classifyLegacyPath(pathname: string, search = ""): LegacyMatch {
  const full = decode(`${pathname}${search}`).toLowerCase();
  const hit = TEMPLATE_MARKERS.some((marker) => full.includes(marker));
  if (!hit) return null;
  return { kind: "legacy", token: extractRegistryToken(`${pathname}${search}`) };
}
