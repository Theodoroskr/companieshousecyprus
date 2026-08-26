/**
 * Dedicated parser for the United Nations Security Council Consolidated List
 * (https://scsanctions.un.org/resources/xml/en/consolidated.xml).
 *
 * The document is a `<CONSOLIDATED_LIST>` root containing `<INDIVIDUALS>` and
 * `<ENTITIES>` collections. Values are element text (unlike the EU FSF feed,
 * which is attribute-based), so this parser is intentionally separate from
 * `parse.ts` — it only reuses the shared low-level helpers and the common
 * normalized `SanctionsRecord` shape.
 *
 * The permanent reference number (e.g. QDi.001, QDe.001, KPi.001) is the
 * source_record_id; names are never used as identifiers.
 */

import { blank, decodeEntities, normalizeName, textOf } from "@/lib/sanctions/parse";
import type {
  SanctionsAddress,
  SanctionsAlias,
  SanctionsIdentifier,
  SanctionsRecord,
} from "@/lib/sanctions/parse";

/** UN sanctions committee / regime derived from the reference-number prefix. */
const COMMITTEE_BY_PREFIX: Record<string, string> = {
  QD: "1267/1989/2253 ISIL (Da'esh) and Al-Qaida Sanctions Committee",
  TA: "1988 Afghanistan/Taliban Sanctions Committee",
  KP: "1718 DPRK Sanctions Committee",
  LY: "1970 Libya Sanctions Committee",
  IR: "1737 Iran Sanctions Committee",
  IQ: "1518 Iraq Sanctions Committee",
  SD: "1591 Sudan Sanctions Committee",
  SO: "751/1907 Somalia and Eritrea Sanctions Committee",
  CD: "1533 DRC Sanctions Committee",
  SS: "2206 South Sudan Sanctions Committee",
  YE: "2140 Yemen Sanctions Committee",
  CF: "2127 Central African Republic Sanctions Committee",
  ML: "2374 Mali Sanctions Committee",
  GN: "2048 Guinea-Bissau Sanctions Committee",
  HT: "2653 Haiti Sanctions Committee",
  SL: "1132 Sierra Leone Sanctions Committee",
  LR: "1521 Liberia Sanctions Committee",
  CI: "1572 Côte d'Ivoire Sanctions Committee",
  RW: "1004 Rwanda Sanctions Committee",
};

export function committeeForReference(reference: string, listType?: string | null): string | null {
  const prefix = /^([A-Za-z]{2})/.exec(reference.trim())?.[1]?.toUpperCase();
  const committee = prefix ? COMMITTEE_BY_PREFIX[prefix] : undefined;
  if (committee) return committee;
  const type = blank(listType);
  return type ? `UN ${type} sanctions regime` : null;
}

/** All complete `<name>…</name>` blocks inside `xml`. */
function blocks(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?</${name}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[0]!);
  return out;
}

/** All text values of `<name>` elements (e.g. `<VALUE>` children). */
function values(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const v = decodeEntities(m[1] ?? "").trim();
    if (v) out.push(v);
  }
  return out;
}

/** Normalise a UN date/datetime string to YYYY-MM-DD where possible. */
function toDate(value: string | null): string | null {
  if (!value) return null;
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function aliasTypeFor(quality: string | null, note: string | null): string {
  const q = (quality ?? "").toLowerCase();
  const n = (note ?? "").toLowerCase();
  if (/f\.?k\.?a|formerly|former name/.test(n)) return "former name";
  if (/acronym|abbreviation/.test(n)) return "acronym";
  if (q === "good") return "good alias";
  if (q === "low") return "low alias";
  return q ? `${q} alias` : "alias";
}

function parseAliasBlocks(xml: string, tag: string): SanctionsAlias[] {
  const out: SanctionsAlias[] = [];
  for (const block of blocks(xml, tag)) {
    const name = blank(textOf(block, "ALIAS_NAME"));
    if (!name) continue;
    out.push({
      alias_name: name,
      alias_name_normalized: normalizeName(name),
      alias_type: aliasTypeFor(textOf(block, "QUALITY"), textOf(block, "NOTE")),
      name_language: null,
      is_primary: false,
    });
  }
  return out;
}

function parseAddressBlocks(xml: string, tag: string): SanctionsAddress[] {
  const out: SanctionsAddress[] = [];
  for (const block of blocks(xml, tag)) {
    const street = blank(textOf(block, "STREET"));
    const city = blank(textOf(block, "CITY"));
    const region = blank(textOf(block, "STATE_PROVINCE"));
    const postcode = blank(textOf(block, "ZIP_CODE"));
    const country = blank(textOf(block, "COUNTRY"));
    const note = blank(textOf(block, "NOTE"));
    const full = [street, city, region, postcode, country].filter(Boolean).join(", ");
    if (!full && !note) continue;
    out.push({
      full_address: note ? (full ? `${full} (${note})` : note) : full,
      street,
      city,
      region,
      postcode,
      country,
      country_code: null,
    });
  }
  return out;
}

function parseDocumentBlocks(xml: string): SanctionsIdentifier[] {
  const out: SanctionsIdentifier[] = [];
  for (const block of blocks(xml, "INDIVIDUAL_DOCUMENT")) {
    const number = blank(textOf(block, "NUMBER"));
    if (!number) continue;
    const type1 = blank(textOf(block, "TYPE_OF_DOCUMENT"));
    const type2 = blank(textOf(block, "TYPE_OF_DOCUMENT2"));
    const type = [type1, type2].filter(Boolean).join(" / ") || "other";
    out.push({
      identifier_type: type.toLowerCase().includes("passport")
        ? "passport"
        : type.toLowerCase().includes("identification") || type.toLowerCase().includes("national")
          ? "national id"
          : type,
      identifier_value: number,
      issuing_country: blank(textOf(block, "ISSUING_COUNTRY")),
      issue_date: toDate(textOf(block, "DATE_OF_ISSUE")),
      expiry_date: toDate(textOf(block, "EXPIRY_DATE")),
    });
  }
  return out;
}

function parseIndividual(block: string): SanctionsRecord | null {
  const reference = blank(textOf(block, "REFERENCE_NUMBER"));
  if (!reference) return null;

  const nameParts = ["FIRST_NAME", "SECOND_NAME", "THIRD_NAME", "FOURTH_NAME"].map((tag) =>
    blank(textOf(block, tag)),
  );
  const fullName = nameParts.filter(Boolean).join(" ");
  const originalScript = blank(textOf(block, "NAME_ORIGINAL_SCRIPT"));
  const listType = blank(textOf(block, "UN_LIST_TYPE"));
  const committee = committeeForReference(reference, listType);

  const aliases: SanctionsAlias[] = [];
  if (fullName) {
    aliases.push({
      alias_name: fullName,
      alias_name_normalized: normalizeName(fullName),
      alias_type: "primary name",
      name_language: null,
      is_primary: true,
    });
  }
  if (originalScript) {
    aliases.push({
      alias_name: originalScript,
      alias_name_normalized: normalizeName(originalScript),
      alias_type: "original script",
      name_language: "original",
      is_primary: !fullName,
    });
  }
  aliases.push(...parseAliasBlocks(block, "INDIVIDUAL_ALIAS"));

  const birthdates = blocks(block, "INDIVIDUAL_DATE_OF_BIRTH").map((d) => ({
    date: toDate(textOf(d, "DATE")),
    year: blank(textOf(d, "YEAR")),
    circa: (blank(textOf(d, "TYPE_OF_DATE")) ?? "").toUpperCase() !== "EXACT",
    calendar: null as string | null,
    note: blank(textOf(d, "NOTE")),
  }));

  const birthplaces = blocks(block, "INDIVIDUAL_PLACE_OF_BIRTH")
    .map((p) => ({
      city: blank(textOf(p, "CITY")),
      region: blank(textOf(p, "STATE_PROVINCE")),
      place: blank(textOf(p, "PLACE")),
      country: blank(textOf(p, "COUNTRY")),
      note: blank(textOf(p, "NOTE")),
    }))
    .filter((p) => p.city || p.place || p.country || p.region);

  const titles = values(textOf(block, "TITLE") ?? "", "VALUE");
  const designations = values(textOf(block, "DESIGNATION") ?? "", "VALUE");
  const nationalities = values(textOf(block, "NATIONALITY") ?? "", "VALUE");

  const lastUpdated = values(textOf(block, "LAST_UPDATED") ?? "", "VALUE")
    .map(toDate)
    .filter((d): d is string => d !== null)
    .sort()
    .pop() ?? null;

  const record: SanctionsRecord = {
    source_record_id: reference,
    entity_type: "person",
    primary_name: fullName || originalScript || "(unnamed)",
    primary_name_normalized: normalizeName(fullName || originalScript || ""),
    name_original_script: originalScript,
    sanctions_programme: committee,
    legal_basis: listType ? `UN List: ${listType}` : "UN Security Council Consolidated List",
    listing_reason: blank(textOf(block, "COMMENTS1")),
    designation_date: toDate(textOf(block, "LISTED_ON")),
    last_amended_date: lastUpdated,
    aliases,
    addresses: parseAddressBlocks(block, "INDIVIDUAL_ADDRESS"),
    identifiers: parseDocumentBlocks(block),
    relationships: [],
    person: {
      date_of_birth: birthdates,
      place_of_birth: birthplaces,
      nationalities: [...new Set(nationalities)],
      citizenships: [...new Set(nationalities)],
      gender: blank(textOf(block, "GENDER")),
      titles: [...new Set(titles)],
    },
    raw: {
      dataId: blank(textOf(block, "DATAID")),
      versionNum: blank(textOf(block, "VERSIONNUM")),
      referenceNumber: reference,
      unListType: listType,
      committee,
      firstName: nameParts[0],
      secondName: nameParts[1],
      thirdName: nameParts[2],
      fourthName: nameParts[3],
      nameOriginalScript: originalScript,
      titles,
      designations,
      nationalities,
      listedOn: blank(textOf(block, "LISTED_ON")),
      lastUpdated: values(textOf(block, "LAST_UPDATED") ?? "", "VALUE"),
      gender: blank(textOf(block, "GENDER")),
      submittedOn: blank(textOf(block, "SUBMITTED_ON")),
      submittedBy: blank(textOf(block, "SUBMITTED_BY")),
      comments: blank(textOf(block, "COMMENTS1")),
      aliases: blocks(block, "INDIVIDUAL_ALIAS"),
      addresses: blocks(block, "INDIVIDUAL_ADDRESS"),
      documents: blocks(block, "INDIVIDUAL_DOCUMENT"),
      birthdates: blocks(block, "INDIVIDUAL_DATE_OF_BIRTH"),
      birthplaces: blocks(block, "INDIVIDUAL_PLACE_OF_BIRTH"),
    },
  };
  return record;
}

function parseEntityBlock(block: string): SanctionsRecord | null {
  const reference = blank(textOf(block, "REFERENCE_NUMBER"));
  if (!reference) return null;

  const name = blank(textOf(block, "FIRST_NAME"));
  const originalScript = blank(textOf(block, "NAME_ORIGINAL_SCRIPT"));
  const listType = blank(textOf(block, "UN_LIST_TYPE"));
  const committee = committeeForReference(reference, listType);

  const aliases: SanctionsAlias[] = [];
  if (name) {
    aliases.push({
      alias_name: name,
      alias_name_normalized: normalizeName(name),
      alias_type: "primary name",
      name_language: null,
      is_primary: true,
    });
  }
  if (originalScript) {
    aliases.push({
      alias_name: originalScript,
      alias_name_normalized: normalizeName(originalScript),
      alias_type: "original script",
      name_language: "original",
      is_primary: !name,
    });
  }
  aliases.push(...parseAliasBlocks(block, "ENTITY_ALIAS"));

  const lastUpdated = values(textOf(block, "LAST_UPDATED") ?? "", "VALUE")
    .map(toDate)
    .filter((d): d is string => d !== null)
    .sort()
    .pop() ?? null;

  return {
    source_record_id: reference,
    entity_type: "entity",
    primary_name: name || originalScript || "(unnamed)",
    primary_name_normalized: normalizeName(name || originalScript || ""),
    name_original_script: originalScript,
    sanctions_programme: committee,
    legal_basis: listType ? `UN List: ${listType}` : "UN Security Council Consolidated List",
    listing_reason: blank(textOf(block, "COMMENTS1")),
    designation_date: toDate(textOf(block, "LISTED_ON")),
    last_amended_date: lastUpdated,
    aliases,
    addresses: parseAddressBlocks(block, "ENTITY_ADDRESS"),
    identifiers: [],
    relationships: [],
    raw: {
      dataId: blank(textOf(block, "DATAID")),
      versionNum: blank(textOf(block, "VERSIONNUM")),
      referenceNumber: reference,
      unListType: listType,
      committee,
      name,
      nameOriginalScript: originalScript,
      listedOn: blank(textOf(block, "LISTED_ON")),
      lastUpdated: values(textOf(block, "LAST_UPDATED") ?? "", "VALUE"),
      submittedOn: blank(textOf(block, "SUBMITTED_ON")),
      submittedBy: blank(textOf(block, "SUBMITTED_BY")),
      comments: blank(textOf(block, "COMMENTS1")),
      aliases: blocks(block, "ENTITY_ALIAS"),
      addresses: blocks(block, "ENTITY_ADDRESS"),
    },
  };
}

/** Yield every individual and entity without materialising a DOM. */
export function* iterateUnRecords(xml: string): Generator<SanctionsRecord> {
  for (const tag of ["INDIVIDUAL", "ENTITY"] as const) {
    const openRe = new RegExp(`<${tag}>`, "g");
    let match: RegExpExecArray | null;
    while ((match = openRe.exec(xml))) {
      const start = match.index;
      const close = xml.indexOf(`</${tag}>`, start);
      if (close === -1) break;
      const end = close + `</${tag}>`.length;
      const block = xml.slice(start, end);
      openRe.lastIndex = end;
      const record = tag === "INDIVIDUAL" ? parseIndividual(block) : parseEntityBlock(block);
      if (record) yield record;
    }
  }
}

/** Structural validation for the UN Consolidated List before a full parse. */
export function looksLikeUnConsolidated(xml: string): { ok: boolean; reason?: string } {
  const head = xml.slice(0, 4096);
  if (/^\s*<(!DOCTYPE\s+html|html)\b/i.test(head)) return { ok: false, reason: "response is an HTML page, not XML" };
  if (!head.includes("<?xml")) return { ok: false, reason: "missing XML declaration" };
  if (!xml.includes("<CONSOLIDATED_LIST")) return { ok: false, reason: "missing <CONSOLIDATED_LIST> root element" };
  if (!xml.includes("<INDIVIDUALS>") && !xml.includes("<ENTITIES>")) {
    return { ok: false, reason: "no INDIVIDUALS or ENTITIES collections found" };
  }
  if (!xml.includes("REFERENCE_NUMBER")) {
    return { ok: false, reason: "document does not contain recognisable UN list fields" };
  }
  if (!/<\/CONSOLIDATED_LIST>\s*$/.test(xml.slice(-400))) {
    return { ok: false, reason: "document is truncated (no closing </CONSOLIDATED_LIST>)" };
  }
  return { ok: true };
}
