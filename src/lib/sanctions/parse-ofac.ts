/**
 * Parser for the OFAC SDN Advanced XML (schema Version 3) export.
 *
 * The Advanced format is a fully relational XML document (~126 MB / 20k
 * entries) split into independent sections:
 *
 *   ReferenceValueSets   - vocabularies keyed by numeric ID
 *   Locations            - address parts keyed by Location ID
 *   IDRegDocuments       - passports, national IDs, IMO numbers, MMSI, ...
 *   DistinctParties      - identities with aliases + features (party profile)
 *   ProfileRelationships - links between party profiles
 *   SanctionsEntries     - list membership (designation events + measures)
 *
 * A SanctionsEntry references a party profile via ProfileID; everything else
 * is joined by numeric ID. Parsing is section-based string scanning (no DOM),
 * keeping memory proportional to the document text plus compact maps.
 */

import { decodeEntities, normalizeName } from "@/lib/sanctions/parse";
import type {
  SanctionsAddress,
  SanctionsAlias,
  SanctionsIdentifier,
  SanctionsRecord,
} from "@/lib/sanctions/parse";

export type OfacParseReport = {
  totalParties: number;
  totalEntries: number;
  skippedNoIdentity: number;
  duplicateEntryIds: number;
  partyTypeCounts: Record<string, number>;
};

const LATIN_SCRIPT_ID = "215";

type Attrs = Record<string, string>;

function attrs(tag: string): Attrs {
  const out: Attrs = {};
  const re = /([\w-]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    const key = m[1];
    const value = m[2];
    if (key !== undefined && value !== undefined) out[key] = value;
  }
  return out;
}

/** Parse a `<FooValues>` reference section into an ID -> label map.
 *  Each refset uses its own element tag (`<FeatureType ID=..>label</FeatureType>`,
 *  `<Value ID=..>label</Value>`, ...), so we match any ID-bearing element. */
function parseRefSet(xml: string, name: string): Map<string, string> {
  const map = new Map<string, string>();
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  if (!m || m[1] === undefined) return map;
  const re = /<(\w+) ID="(\d+)"[^>]*>([^<]+)<\/\1>/g;
  let v: RegExpExecArray | null;
  while ((v = re.exec(m[1]))) {
    const id = v[2];
    const label = v[3];
    if (id !== undefined && label !== undefined) map.set(id, decodeEntities(label.trim()));
  }
  return map;
}

/** Yield all complete `<Tag ...>...</Tag>` blocks found in `text`. */
function* blocks(text: string, tag: string): Generator<{ attrs: Attrs; body: string }> {
  const re = new RegExp(`<${tag} ([^>]*)>([\\s\\S]*?)</${tag}>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const a = m[1];
    const body = m[2];
    if (a !== undefined && body !== undefined) yield { attrs: attrs(a), body };
  }
}

function sliceSection(xml: string, tag: string): string {
  const open = xml.indexOf(`<${tag}>`);
  if (open < 0) return "";
  const close = xml.indexOf(`</${tag}>`, open);
  if (close < 0) throw new Error(`Missing closing tag for ${tag} (truncated file?)`);
  return xml.slice(open, close + tag.length + 3);
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

type LocationInfo = {
  parts: { type: string; value: string }[];
  country: string | null;
};

function parseLocations(
  xml: string,
  locPartTypes: Map<string, string>,
  countries: Map<string, string>,
): Map<string, LocationInfo> {
  const section = sliceSection(xml, "Locations");
  const map = new Map<string, LocationInfo>();
  for (const loc of blocks(section, "Location")) {
    const parts: { type: string; value: string }[] = [];
    const partRe = /<LocationPart LocPartTypeID="(\d+)"[^>]*>[\s\S]*?<Value>([\s\S]*?)<\/Value>/g;
    let p: RegExpExecArray | null;
    while ((p = partRe.exec(loc.body))) {
      const typeId = p[1];
      const rawValue = p[2];
      if (typeId === undefined || rawValue === undefined) continue;
      const value = decodeEntities(rawValue.trim());
      if (value) parts.push({ type: locPartTypes.get(typeId) ?? `type ${typeId}`, value });
    }
    const countryM = loc.body.match(/<LocationCountry CountryID="(\d+)"/);
    const countryId = countryM?.[1];
    const country = countryId !== undefined ? countries.get(countryId) ?? null : null;
    const id = loc.attrs["ID"];
    if (id !== undefined) map.set(id, { parts, country });
  }
  return map;
}

function locationToAddress(info: LocationInfo): SanctionsAddress {
  const street = info.parts.find((p) => /address/i.test(p.type))?.value ?? null;
  const city = info.parts.find((p) => /city/i.test(p.type))?.value ?? null;
  const region = info.parts.find((p) => /state|province|region/i.test(p.type))?.value ?? null;
  const postcode = info.parts.find((p) => /postal|zip/i.test(p.type))?.value ?? null;
  const full = [...info.parts.map((p) => p.value), info.country].filter(Boolean).join(", ");
  return { full_address: full, street, city, region, postcode, country: info.country, country_code: null };
}

/** Short location string for place-of-birth / nationality features. */
function locationSummary(info: LocationInfo | undefined): string | null {
  if (!info) return null;
  const text = info.parts.map((p) => p.value).join(", ");
  const combined = [text || null, info.country].filter(Boolean).join(", ");
  return combined || null;
}

// ---------------------------------------------------------------------------
// IDRegDocuments (passports, national IDs, IMO numbers, MMSI, ...)
// ---------------------------------------------------------------------------

type IdDoc = {
  identityId: string | null;
  typeLabel: string;
  number: string | null;
  issuingCountry: string | null;
  issuingAuthority: string | null;
  comment: string | null;
};

function parseIdRegDocuments(
  xml: string,
  docTypes: Map<string, string>,
  countries: Map<string, string>,
): Map<string, IdDoc[]> {
  const section = sliceSection(xml, "IDRegDocuments");
  const byIdentity = new Map<string, IdDoc[]>();
  for (const doc of blocks(section, "IDRegDocument")) {
    const typeId = doc.attrs["IDRegDocTypeID"];
    const typeLabel = (typeId !== undefined ? docTypes.get(typeId) : undefined) ?? `Document type ${typeId ?? "?"}`;
    const num = doc.body.match(/<IDRegistrationNo>([\s\S]*?)<\/IDRegistrationNo>/);
    const auth = doc.body.match(/<IssuingAuthority>([\s\S]*?)<\/IssuingAuthority>/);
    const comment = doc.body.match(/<Comment>([\s\S]*?)<\/Comment>/);
    const countryId = doc.attrs["IssuedBy-CountryID"];
    const item: IdDoc = {
      identityId: doc.attrs["IdentityID"] ?? null,
      typeLabel,
      number: num?.[1] !== undefined ? decodeEntities(num[1].trim()) || null : null,
      issuingCountry: countryId !== undefined ? countries.get(countryId) ?? null : null,
      issuingAuthority: auth?.[1] !== undefined ? decodeEntities(auth[1].trim()) || null : null,
      comment: comment?.[1] !== undefined ? decodeEntities(comment[1].trim()) || null : null,
    };
    if (!item.identityId) continue;
    const list = byIdentity.get(item.identityId) ?? [];
    list.push(item);
    byIdentity.set(item.identityId, list);
  }
  return byIdentity;
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

type PartyName = {
  text: string;
  isPrimary: boolean;
  aliasTypeId: string;
  lowQuality: boolean;
  isLatin: boolean;
};

type PartyFeature = {
  typeId: string;
  detailText: string | null;
  detailRefId: string | null;
  locationId: string | null;
  date: { year: string; month: string | null; day: string | null } | null;
  comment: string | null;
};

type Party = {
  profileId: string;
  subtypeId: string;
  identityIds: string[];
  names: PartyName[];
  originalScriptName: string | null;
  features: PartyFeature[];
  hasPersonNameParts: boolean;
};

const PERSON_NAME_PART_TYPES = new Set(["1520", "1521", "1522"]); // last / first / middle name

function parseParty(block: { attrs: Attrs; body: string }): Party | null {
  const profileM = block.body.match(/<Profile ID="(\d+)" PartySubTypeID="(\d+)"/);
  const profileId = profileM?.[1];
  const subtypeId = profileM?.[2];
  if (profileId === undefined || subtypeId === undefined) return null;

  const names: PartyName[] = [];
  const identityIds: string[] = [];
  let originalScriptName: string | null = null;
  let hasPersonNameParts = false;

  const identityRe = /<Identity ID="(\d+)"[^>]*>([\s\S]*?)(?=<Identity ID=|<\/Profile>)/g;
  let idm: RegExpExecArray | null;
  while ((idm = identityRe.exec(block.body))) {
    const identityId = idm[1];
    const idBody = idm[2];
    if (identityId === undefined || idBody === undefined) continue;
    identityIds.push(identityId);

    const npgRe = /NamePartTypeID="(\d+)"/g;
    let npg: RegExpExecArray | null;
    while ((npg = npgRe.exec(idBody))) {
      if (npg[1] !== undefined && PERSON_NAME_PART_TYPES.has(npg[1])) hasPersonNameParts = true;
    }

    for (const alias of blocks(idBody, "Alias")) {
      const docRe = /<DocumentedName ID="\d+"[^>]*>([\s\S]*?)<\/DocumentedName>/g;
      let dm: RegExpExecArray | null;
      const latinParts: string[] = [];
      const nativeParts: string[] = [];
      let latinSeen = false;
      while ((dm = docRe.exec(alias.body))) {
        const docBody = dm[1];
        if (docBody === undefined) continue;
        const nameParts = [...docBody.matchAll(/<NamePartValue[^>]*>([\s\S]*?)<\/NamePartValue>/g)]
          .map((n) => (n[1] !== undefined ? decodeEntities(n[1].trim()) : ""))
          .filter(Boolean);
        const scripts = [...docBody.matchAll(/ScriptID="(\d+)"/g)]
          .map((s) => s[1])
          .filter((s): s is string => s !== undefined);
        const isLatin = !scripts.some((s) => s !== LATIN_SCRIPT_ID);
        if (isLatin) {
          latinSeen = true;
          latinParts.push(nameParts.join(" "));
        } else {
          nativeParts.push(nameParts.join(" "));
        }
      }
      const primaryText = latinParts.filter(Boolean).join(" ") || nativeParts.filter(Boolean).join(" ");
      if (primaryText) {
        names.push({
          text: primaryText,
          isPrimary: alias.attrs["Primary"] === "true",
          aliasTypeId: alias.attrs["AliasTypeID"] ?? "",
          lowQuality: alias.attrs["LowQuality"] === "true",
          isLatin: latinSeen,
        });
      }
      const nativeText = nativeParts.filter(Boolean).join(" ");
      if (nativeText && alias.attrs["Primary"] === "true") originalScriptName = originalScriptName ?? nativeText;
    }
  }

  const features: PartyFeature[] = [];
  for (const feat of blocks(block.body, "Feature")) {
    const typeId = feat.attrs["FeatureTypeID"];
    if (typeId === undefined) continue;
    const vd = feat.body.match(/<VersionDetail DetailTypeID="\d+"(?: DetailReferenceID="(\d+)")?\s*(?:\/>|>([\s\S]*?)<\/VersionDetail>)/);
    const vl = feat.body.match(/<VersionLocation LocationID="(\d+)"/);
    const dp = feat.body.match(
      /<DatePeriod[\s\S]*?<Start[^>]*>[\s\S]*?<From>\s*<Year>(\d+)<\/Year>(?:\s*<Month>(\d+)<\/Month>)?(?:\s*<Day>(\d+)<\/Day>)?/,
    );
    const cm = feat.body.match(/<Comment>([\s\S]*?)<\/Comment>/);
    const dpYear = dp?.[1];
    features.push({
      typeId,
      detailText: vd?.[2] !== undefined && vd[2] !== null ? decodeEntities(vd[2].trim()) || null : null,
      detailRefId: vd?.[1] ?? null,
      locationId: vl?.[1] ?? null,
      date: dpYear !== undefined && dpYear !== null ? { year: dpYear, month: dp?.[2] ?? null, day: dp?.[3] ?? null } : null,
      comment: cm?.[1] !== undefined ? decodeEntities(cm[1].trim()) || null : null,
    });
  }

  return { profileId, subtypeId, identityIds, names, originalScriptName, features, hasPersonNameParts };
}

// ---------------------------------------------------------------------------
// Feature classification
// ---------------------------------------------------------------------------

const FT = {
  birthdate: "8",
  pob: "9",
  nationality: "10",
  citizenship: "11",
  website: "14",
  email: "21",
  location: "25",
  title: "26",
  gender: "224",
  callSign: "1",
  vesselType: "2",
  vesselFlag: "3",
  vesselOwner: "4",
  tonnage: "5",
  grt: "6",
  aircraftSerial: "44",
  aircraftManufactureDate: "45",
  aircraftModeS: "46",
  aircraftModel: "47",
  aircraftOperator: "48",
  aircraftPrevTail: "49",
  aircraftMsn: "50",
  aircraftTail: "64",
} as const;

function featureDateToString(d: { year: string; month: string | null; day: string | null } | null): string | null {
  if (!d) return null;
  const mm = d.month?.padStart(2, "0");
  const dd = d.day?.padStart(2, "0");
  if (mm && dd) return `${d.year}-${mm}-${dd}`;
  if (mm) return `${d.year}-${mm}`;
  return d.year;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function parseOfac(xml: string): { records: SanctionsRecord[]; report: OfacParseReport } {
  if (!xml.includes("<Sanctions")) throw new Error("Not an OFAC Advanced XML document (missing <Sanctions> root)");
  if (!xml.trimEnd().endsWith("</Sanctions>")) {
    throw new Error("Document is truncated (missing </Sanctions> closing tag)");
  }

  const aliasTypes = parseRefSet(xml, "AliasTypeValues");
  const featureTypes = parseRefSet(xml, "FeatureTypeValues");
  const detailRefs = parseRefSet(xml, "DetailReferenceValues");
  const docTypes = parseRefSet(xml, "IDRegDocTypeValues");
  const countries = parseRefSet(xml, "CountryValues");
  const legalBases = parseRefSet(xml, "LegalBasisValues");
  const locPartTypes = parseRefSet(xml, "LocPartTypeValues");

  const locations = parseLocations(xml, locPartTypes, countries);
  const idDocsByIdentity = parseIdRegDocuments(xml, docTypes, countries);

  // --- parties ---
  const parties = new Map<string, Party>();
  for (const block of blocks(sliceSection(xml, "DistinctParties"), "DistinctParty")) {
    const party = parseParty(block);
    if (party) parties.set(party.profileId, party);
  }

  // --- relationships ---
  const relationshipsByEntry = new Map<string, { related: string; former: boolean }[]>();
  for (const rel of blocks(sliceSection(xml, "ProfileRelationships"), "ProfileRelationship")) {
    const entryId = rel.attrs["SanctionsEntryID"];
    const related = rel.attrs["To-ProfileID"];
    if (entryId === undefined || related === undefined) continue;
    const list = relationshipsByEntry.get(entryId) ?? [];
    list.push({ related, former: rel.attrs["Former"] === "true" });
    relationshipsByEntry.set(entryId, list);
  }

  // --- entries ---
  const records: SanctionsRecord[] = [];
  const seenEntryIds = new Set<string>();
  const partyTypeCounts: Record<string, number> = {};
  let duplicateEntryIds = 0;
  let skippedNoIdentity = 0;

  for (const entry of blocks(sliceSection(xml, "SanctionsEntries"), "SanctionsEntry")) {
    const entryId = entry.attrs["ID"];
    if (entryId === undefined) continue;
    if (seenEntryIds.has(entryId)) {
      duplicateEntryIds += 1;
      continue;
    }
    seenEntryIds.add(entryId);

    const profileId = entry.attrs["ProfileID"];
    const party = profileId !== undefined ? parties.get(profileId) : undefined;
    if (!party || party.names.length === 0) {
      skippedNoIdentity += 1;
      continue;
    }

    // ---- names / aliases ----
    const primaryName = party.names.find((n) => n.isPrimary) ?? party.names[0];
    if (!primaryName) {
      skippedNoIdentity += 1;
      continue;
    }
    const aliases: SanctionsAlias[] = [];
    for (const name of party.names) {
      const typeLabel = aliasTypes.get(name.aliasTypeId) ?? "";
      const aliasType = name.isPrimary
        ? "primary"
        : name.lowQuality
          ? "weak"
          : /^f\.?k\.?a/i.test(typeLabel)
            ? "former"
            : /^n\.?k\.?a/i.test(typeLabel)
              ? "also known as"
              : "alias";
      aliases.push({
        alias_name: name.text,
        alias_name_normalized: normalizeName(name.text),
        alias_type: aliasType,
        name_language: name.isLatin ? "latin" : "original script",
        is_primary: name.isPrimary,
      });
    }

    // ---- features ----
    const addresses: SanctionsAddress[] = [];
    const identifiers: SanctionsIdentifier[] = [];
    const wallets: { currency: string; address: string }[] = [];
    const dobs: unknown[] = [];
    const pobs: unknown[] = [];
    const nationalities = new Set<string>();
    const citizenships = new Set<string>();
    const titles = new Set<string>();
    const vesselDetails: Record<string, string> = {};
    const aircraftDetails: Record<string, string> = {};
    const websites: string[] = [];
    const emails: string[] = [];
    let gender: string | null = null;
    let hasPersonSignal = false;

    for (const feat of party.features) {
      const typeLabel = featureTypes.get(feat.typeId) ?? "";
      const detailValue =
        feat.detailText ?? (feat.detailRefId !== null ? detailRefs.get(feat.detailRefId) ?? null : null);
      switch (feat.typeId) {
        case FT.birthdate: {
          hasPersonSignal = true;
          const s = featureDateToString(feat.date);
          if (s) dobs.push({ date: s, approximate: true });
          break;
        }
        case FT.pob: {
          hasPersonSignal = true;
          const place = locationSummary(feat.locationId !== null ? locations.get(feat.locationId) : undefined);
          if (place) pobs.push({ place });
          break;
        }
        case FT.nationality: {
          hasPersonSignal = true;
          const value = detailValue ?? locationSummary(feat.locationId !== null ? locations.get(feat.locationId) : undefined);
          if (value) nationalities.add(value);
          break;
        }
        case FT.citizenship: {
          hasPersonSignal = true;
          const value = detailValue ?? locationSummary(feat.locationId !== null ? locations.get(feat.locationId) : undefined);
          if (value) citizenships.add(value);
          break;
        }
        case FT.gender: {
          hasPersonSignal = true;
          if (detailValue) gender = gender ?? detailValue;
          break;
        }
        case FT.title:
          if (detailValue) titles.add(detailValue);
          break;
        case FT.location: {
          const info = feat.locationId !== null ? locations.get(feat.locationId) : undefined;
          if (info) addresses.push(locationToAddress(info));
          break;
        }
        case FT.website:
          if (detailValue) websites.push(detailValue);
          break;
        case FT.email:
          if (detailValue) emails.push(detailValue);
          break;
        case FT.callSign:
          if (detailValue) {
            identifiers.push({ identifier_type: "call_sign", identifier_value: detailValue, issuing_country: null, issue_date: null, expiry_date: null });
            vesselDetails["callSign"] = detailValue;
          }
          break;
        case FT.vesselType:
          if (detailValue) vesselDetails["vesselType"] = detailValue;
          break;
        case FT.vesselFlag:
          if (detailValue) vesselDetails["flag"] = detailValue;
          break;
        case FT.vesselOwner:
          if (detailValue) vesselDetails["owner"] = detailValue;
          break;
        case FT.tonnage:
          if (detailValue) vesselDetails["tonnage"] = detailValue;
          break;
        case FT.grt:
          if (detailValue) vesselDetails["grt"] = detailValue;
          break;
        case FT.aircraftSerial:
          if (detailValue) aircraftDetails["serialNumber"] = detailValue;
          break;
        case FT.aircraftManufactureDate:
          if (detailValue) aircraftDetails["manufactureDate"] = detailValue;
          break;
        case FT.aircraftModeS:
          if (detailValue) aircraftDetails["modeS"] = detailValue;
          break;
        case FT.aircraftModel:
          if (detailValue) aircraftDetails["model"] = detailValue;
          break;
        case FT.aircraftOperator:
          if (detailValue) aircraftDetails["operator"] = detailValue;
          break;
        case FT.aircraftPrevTail:
          if (detailValue) aircraftDetails["previousTailNumber"] = detailValue;
          break;
        case FT.aircraftMsn:
          if (detailValue) aircraftDetails["msn"] = detailValue;
          break;
        case FT.aircraftTail:
          if (detailValue) {
            aircraftDetails["tailNumber"] = detailValue;
            identifiers.push({ identifier_type: "aircraft_tail_number", identifier_value: detailValue, issuing_country: null, issue_date: null, expiry_date: null });
          }
          break;
        default: {
          if (typeLabel.startsWith("Digital Currency Address")) {
            const currency = typeLabel.split("-").pop()?.trim() ?? "unknown";
            if (detailValue) {
              wallets.push({ currency, address: detailValue });
              identifiers.push({
                identifier_type: "digital_currency_address",
                identifier_value: `${currency}:${detailValue}`,
                issuing_country: null,
                issue_date: null,
                expiry_date: null,
              });
            }
          }
        }
      }
    }

    // ---- registration documents ----
    for (const identityId of party.identityIds) {
      for (const doc of idDocsByIdentity.get(identityId) ?? []) {
        const value = [doc.number, doc.comment].filter(Boolean).join(" ").trim();
        if (!value) continue;
        identifiers.push({
          identifier_type: doc.typeLabel,
          identifier_value: value,
          issuing_country: doc.issuingCountry ?? doc.issuingAuthority,
          issue_date: null,
          expiry_date: null,
        });
      }
    }

    // ---- entity classification ----
    // PartySubTypeID: 1 = Vessel, 2 = Aircraft. All other parties are persons
    // or entities, distinguished by person-only signals (birth data, gender,
    // citizenship) or person-style name parts (first/last/middle).
    let entityType: string;
    if (party.subtypeId === "1") entityType = "ship";
    else if (party.subtypeId === "2") entityType = "aircraft";
    else entityType = hasPersonSignal || party.hasPersonNameParts ? "person" : "entity";
    partyTypeCounts[entityType] = (partyTypeCounts[entityType] ?? 0) + 1;

    // ---- entry event + measures ----
    const dateM = entry.body.match(
      /<EntryEvent[^>]*LegalBasisID="(\d+)"[\s\S]*?<Date[^>]*>\s*<Year>(\d+)<\/Year>(?:\s*<Month>(\d+)<\/Month>)?(?:\s*<Day>(\d+)<\/Day>)?/,
    );
    const legalBasisId = dateM?.[1];
    const legalBasis = legalBasisId !== undefined ? legalBases.get(legalBasisId) ?? null : null;
    const designationDate =
      dateM?.[2] !== undefined && dateM[3] !== undefined && dateM[4] !== undefined
        ? `${dateM[2]}-${dateM[3].padStart(2, "0")}-${dateM[4].padStart(2, "0")}`
        : null;

    const programmes = new Set<string>();
    const comments = new Set<string>();
    for (const measure of blocks(entry.body, "SanctionsMeasure")) {
      const cm = measure.body.match(/<Comment>([\s\S]*?)<\/Comment>/);
      if (cm?.[1] !== undefined) {
        const text = decodeEntities(cm[1].trim());
        if (text) programmes.add(text);
      }
    }
    const entryComment = entry.body.match(/<EntryEvent[^>]*>\s*<Comment>([\s\S]*?)<\/Comment>/);
    if (entryComment?.[1] !== undefined) {
      const text = decodeEntities(entryComment[1].trim());
      if (text) comments.add(text);
    }

    // ---- relationships ----
    const relationships = (relationshipsByEntry.get(entryId) ?? [])
      .map((rel) => {
        const relatedParty = parties.get(rel.related);
        const relatedName = relatedParty?.names.find((n) => n.isPrimary)?.text ?? relatedParty?.names[0]?.text ?? "";
        return {
          related_source_record_id: rel.related || null,
          related_name: relatedName,
          relationship_type: rel.former ? "former_relationship" : "associated",
          source_description: null,
        };
      })
      .filter((r) => r.related_name);

    const record: SanctionsRecord = {
      source_record_id: entryId,
      entity_type: entityType,
      primary_name: primaryName.text,
      primary_name_normalized: normalizeName(primaryName.text),
      name_original_script: party.originalScriptName,
      sanctions_programme: [...programmes].join("; ") || null,
      legal_basis: legalBasis,
      listing_reason: [...comments].join("; ") || null,
      designation_date: designationDate,
      last_amended_date: null,
      aliases,
      addresses,
      identifiers,
      relationships,
      raw: {
        profileId: party.profileId,
        partySubtypeId: party.subtypeId,
        wallets: wallets.length ? wallets : undefined,
        vessel: Object.keys(vesselDetails).length ? vesselDetails : undefined,
        aircraft: Object.keys(aircraftDetails).length ? aircraftDetails : undefined,
        websites: websites.length ? websites : undefined,
        emails: emails.length ? emails : undefined,
      },
    };
    if (entityType === "person") {
      record.person = {
        date_of_birth: dobs,
        place_of_birth: pobs,
        nationalities: [...nationalities],
        citizenships: [...citizenships],
        gender,
        titles: [...titles],
      };
    }
    records.push(record);
  }

  return {
    records,
    report: {
      totalParties: parties.size,
      totalEntries: records.length,
      skippedNoIdentity,
      duplicateEntryIds,
      partyTypeCounts,
    },
  };
}
