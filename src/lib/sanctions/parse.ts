/**
 * Streaming-friendly parser for the EU Consolidated Financial Sanctions List
 * (FSF format, version 1.1).
 *
 * The file is one large `<export>` element containing ~6k `<sanctionEntity>`
 * blocks. Rather than building a DOM for a 26 MB document we scan the text for
 * complete entity blocks and map each one independently, so peak memory stays
 * proportional to a single record.
 */

export type SanctionsAlias = {
  alias_name: string;
  alias_name_normalized: string;
  alias_type: string;
  name_language: string | null;
  is_primary: boolean;
};

export type SanctionsAddress = {
  full_address: string;
  street: string | null;
  city: string | null;
  region: string | null;
  postcode: string | null;
  country: string | null;
  country_code: string | null;
};

export type SanctionsIdentifier = {
  identifier_type: string;
  identifier_value: string;
  issuing_country: string | null;
  issue_date: string | null;
  expiry_date: string | null;
};

export type SanctionsPerson = {
  date_of_birth: unknown[];
  place_of_birth: unknown[];
  nationalities: string[];
  citizenships: string[];
  gender: string | null;
  titles: string[];
};

export type SanctionsRecord = {
  source_record_id: string;
  entity_type: string;
  primary_name: string;
  primary_name_normalized: string;
  name_original_script: string | null;
  sanctions_programme: string | null;
  legal_basis: string | null;
  listing_reason: string | null;
  designation_date: string | null;
  last_amended_date: string | null;
  aliases: SanctionsAlias[];
  addresses: SanctionsAddress[];
  identifiers: SanctionsIdentifier[];
  relationships: { related_source_record_id: string | null; related_name: string; relationship_type: string; source_description: string | null }[];
  person?: SanctionsPerson;
  raw: Record<string, unknown>;
};

const GREEK_MAP: Record<string, string> = {
  Α: "A", Β: "V", Γ: "G", Δ: "D", Ε: "E", Ζ: "Z", Η: "I", Θ: "TH", Ι: "I", Κ: "K",
  Λ: "L", Μ: "M", Ν: "N", Ξ: "X", Ο: "O", Π: "P", Ρ: "R", Σ: "S", Τ: "T", Υ: "Y",
  Φ: "F", Χ: "CH", Ψ: "PS", Ω: "O",
};

/** Uppercase, de-accent, transliterate Greek and strip punctuation. */
export function normalizeName(value: string): string {
  if (!value) return "";
  const upper = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const latin = [...upper].map((ch) => GREEK_MAP[ch] ?? ch).join("");
  return latin.replace(/[^A-Z0-9]+/g, " ").trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&");
}

const ATTR_RE = /([A-Za-z_:][\w.:-]*)\s*=\s*"([^"]*)"/g;

export function parseAttributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(tag))) out[m[1]!] = decodeEntities(m[2] ?? "");
  return out;
}

/** All opening tags of `name` inside `xml`, as attribute maps. */
function collect(xml: string, name: string): Record<string, string>[] {
  const re = new RegExp(`<${name}\\b([^>]*)/?>`, "g");
  const out: Record<string, string>[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(parseAttributes(m[1] ?? ""));
  return out;
}

function textOf(xml: string, name: string): string | null {
  const m = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(xml);
  return m ? decodeEntities(m[1] ?? "").trim() || null : null;
}

function blank(value: string | undefined | null): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length ? trimmed : null;
}

/** Map a single `<sanctionEntity>…</sanctionEntity>` block. */
export function parseEntity(block: string): SanctionsRecord | null {
  const openTag = /<sanctionEntity\b([^>]*)>/.exec(block);
  if (!openTag) return null;
  const attrs = parseAttributes(openTag[1] ?? "");
  const sourceRecordId = blank(attrs["euReferenceNumber"]) ?? blank(attrs["logicalId"]);
  if (!sourceRecordId) return null;

  const subject = collect(block, "subjectType")[0] ?? {};
  const entityTypeRaw = (subject["code"] ?? "unknown").toLowerCase();
  const entityType = entityTypeRaw === "person" ? "person" : entityTypeRaw === "enterprise" ? "entity" : entityTypeRaw;

  const regulations = collect(block, "regulation");
  const regulation = regulations[0] ?? {};

  const nameAliases = collect(block, "nameAlias");
  const aliases: SanctionsAlias[] = [];
  let originalScript: string | null = null;
  for (const alias of nameAliases) {
    const whole =
      blank(alias["wholeName"]) ??
      blank([alias["firstName"], alias["middleName"], alias["lastName"]].filter(Boolean).join(" "));
    if (!whole) continue;
    const normalized = normalizeName(whole);
    if (!originalScript && /[^\u0000-\u024F]/.test(whole)) originalScript = whole;
    aliases.push({
      alias_name: whole,
      alias_name_normalized: normalized,
      alias_type: alias["strong"] === "false" ? "weak alias" : "alias",
      name_language: blank(alias["nameLanguage"]),
      is_primary: false,
    });
  }

  // The first Latin-script alias is treated as the primary name.
  const primaryIndex = aliases.findIndex((a) => a.alias_name_normalized.length > 0);
  const primary = primaryIndex >= 0 ? aliases[primaryIndex]! : null;
  if (primary) primary.is_primary = true;

  const addresses: SanctionsAddress[] = collect(block, "address")
    .map((a) => {
      const parts = [a["street"], a["poBox"], a["city"], a["region"], a["zipCode"], a["countryDescription"]]
        .map((p) => blank(p))
        .filter(Boolean);
      const full = parts.join(", ");
      if (!full) return null;
      return {
        full_address: full,
        street: blank(a["street"]),
        city: blank(a["city"]),
        region: blank(a["region"]),
        postcode: blank(a["zipCode"]),
        country: blank(a["countryDescription"]),
        country_code: blank(a["countryIso2Code"]),
      } satisfies SanctionsAddress;
    })
    .filter((a): a is SanctionsAddress => a !== null);

  const identifiers: SanctionsIdentifier[] = collect(block, "identification")
    .map((i) => {
      const value = blank(i["number"]) ?? blank(i["latinNumber"]);
      if (!value) return null;
      return {
        identifier_type: blank(i["identificationTypeCode"]) ?? "other",
        identifier_value: value,
        issuing_country: blank(i["countryDescription"]) ?? blank(i["issuedBy"]),
        issue_date: blank(i["issueDate"]),
        expiry_date: blank(i["expiryDate"]),
      } satisfies SanctionsIdentifier;
    })
    .filter((i): i is SanctionsIdentifier => i !== null);

  const citizenships = collect(block, "citizenship")
    .map((c) => blank(c["countryDescription"]) ?? blank(c["countryIso2Code"]))
    .filter((c): c is string => c !== null);

  const birthdates = collect(block, "birthdate").map((b) => ({
    date: blank(b["birthdate"]),
    year: blank(b["year"]),
    month: blank(b["monthOfYear"]),
    day: blank(b["dayOfMonth"]),
    circa: b["circa"] === "true",
    calendar: blank(b["calendarType"]),
  }));

  const birthplaces = collect(block, "birthdate")
    .map((b) => ({
      city: blank(b["city"]),
      region: blank(b["region"]),
      place: blank(b["place"]),
      country: blank(b["countryDescription"]),
      country_code: blank(b["countryIso2Code"]),
    }))
    .filter((p) => p.city || p.place || p.country);

  const record: SanctionsRecord = {
    source_record_id: sourceRecordId,
    entity_type: entityType,
    primary_name: primary?.alias_name ?? "(unnamed)",
    primary_name_normalized: primary?.alias_name_normalized ?? "",
    name_original_script: originalScript,
    sanctions_programme: blank(regulation["programme"]),
    legal_basis: blank(regulation["numberTitle"]),
    listing_reason: textOf(block, "remark") ?? blank(attrs["designationDetails"]),
    designation_date: blank(regulation["entryIntoForceDate"]) ?? blank(regulation["publicationDate"]),
    last_amended_date:
      regulations
        .map((r) => blank(r["publicationDate"]))
        .filter((d): d is string => d !== null)
        .sort()
        .pop() ?? null,
    aliases,
    addresses,
    identifiers,
    relationships: [],
    raw: {
      euReferenceNumber: blank(attrs["euReferenceNumber"]),
      unitedNationId: blank(attrs["unitedNationId"]),
      logicalId: blank(attrs["logicalId"]),
      designationDetails: blank(attrs["designationDetails"]),
      subjectType: subject,
      regulations,
      remark: textOf(block, "remark"),
      nameAliases,
      addresses: collect(block, "address"),
      identifications: collect(block, "identification"),
      citizenships: collect(block, "citizenship"),
      birthdates: collect(block, "birthdate"),
      contactInfo: collect(block, "contactInfo"),
    },
  };

  if (entityType === "person") {
    const titles = nameAliases.map((a) => blank(a["title"])).filter((t): t is string => t !== null);
    const gender = nameAliases.map((a) => blank(a["gender"])).find((g) => g) ?? null;
    record.person = {
      date_of_birth: birthdates,
      place_of_birth: birthplaces,
      nationalities: [...new Set(citizenships)],
      citizenships: [...new Set(citizenships)],
      gender,
      titles: [...new Set(titles)],
    };
  }

  return record;
}

/** Yield every entity in an FSF 1.1 document without materialising a DOM. */
export function* iterateEntities(xml: string): Generator<SanctionsRecord> {
  const openRe = /<sanctionEntity\b/g;
  let match: RegExpExecArray | null;
  while ((match = openRe.exec(xml))) {
    const start = match.index;
    const close = xml.indexOf("</sanctionEntity>", start);
    if (close === -1) break;
    const end = close + "</sanctionEntity>".length;
    const record = parseEntity(xml.slice(start, end));
    openRe.lastIndex = end;
    if (record) yield record;
  }
}

/** Cheap structural validation before we commit to a full parse. */
export function looksLikeFsf11(xml: string): { ok: boolean; reason?: string } {
  const head = xml.slice(0, 4096);
  if (/^\s*<(!DOCTYPE\s+html|html)\b/i.test(head)) return { ok: false, reason: "response is an HTML page, not XML" };
  if (!head.includes("<?xml")) return { ok: false, reason: "missing XML declaration" };
  if (!xml.includes("<export")) return { ok: false, reason: "missing <export> root element" };
  if (!xml.includes("<sanctionEntity")) return { ok: false, reason: "no <sanctionEntity> records found" };
  if (!xml.includes("<subjectType") || !xml.includes("<nameAlias")) {
    return { ok: false, reason: "document does not contain recognisable FSF 1.1 fields" };
  }
  if (!/<\/export>\s*$/.test(xml.slice(-200))) return { ok: false, reason: "document is truncated (no closing </export>)" };
  return { ok: true };
}

/** Stable hash input for change detection on a single record. */
export function recordFingerprint(record: SanctionsRecord): string {
  return JSON.stringify([
    record.source_record_id,
    record.entity_type,
    record.primary_name,
    record.sanctions_programme,
    record.legal_basis,
    record.listing_reason,
    record.designation_date,
    record.last_amended_date,
    record.aliases.map((a) => [a.alias_name, a.alias_type, a.name_language]),
    record.addresses.map((a) => a.full_address),
    record.identifiers.map((i) => [i.identifier_type, i.identifier_value]),
    record.person ?? null,
  ]);
}
