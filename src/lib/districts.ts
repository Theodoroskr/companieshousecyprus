/**
 * The Cyprus districts that registry records use (`companies.district_en`),
 * plus the Greek/transliterated spellings people and old links use.
 *
 * District pages only exist for these slugs. Any other value gets a real 404
 * instead of an indexable "0 entities" page (which Google reports as Soft 404).
 */
export const DISTRICTS = [
  { slug: "nicosia", name: "Nicosia" },
  { slug: "limassol", name: "Limassol" },
  { slug: "larnaca", name: "Larnaca" },
  { slug: "paphos", name: "Paphos" },
  { slug: "famagusta", name: "Famagusta" },
  { slug: "kyrenia", name: "Kyrenia" },
] as const;

export type District = (typeof DISTRICTS)[number];

const ALIASES: Record<string, District["slug"]> = {
  lefkosia: "nicosia",
  levkosia: "nicosia",
  lefkosa: "nicosia",
  lemesos: "limassol",
  limasol: "limassol",
  larnaka: "larnaca",
  pafos: "paphos",
  ammochostos: "famagusta",
  amochostos: "famagusta",
  gazimagusa: "famagusta",
  keryneia: "kyrenia",
  kerynia: "kyrenia",
  girne: "kyrenia",
};

export type DistrictResolution =
  | { kind: "ok"; district: District }
  | { kind: "redirect"; slug: District["slug"] }
  | { kind: "unknown" };

/** Map a URL segment to a district: exact canonical slug, a permanent redirect target, or unknown. */
export function resolveDistrict(param: string): DistrictResolution {
  let raw = param;
  try {
    raw = decodeURIComponent(param);
  } catch {
    return { kind: "unknown" };
  }
  const key = raw.trim().toLowerCase();
  const direct = DISTRICTS.find((d) => d.slug === key);
  if (direct) return param === direct.slug ? { kind: "ok", district: direct } : { kind: "redirect", slug: direct.slug };
  const alias = ALIASES[key];
  if (alias) return { kind: "redirect", slug: alias };
  return { kind: "unknown" };
}
