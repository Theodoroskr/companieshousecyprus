/**
 * Parser for the UK Sanctions List XML published by the Foreign, Commonwealth
 * & Development Office (https://sanctionslist.fcdo.gov.uk).
 *
 * The file is a single `<Designations>` element containing `<Designation>`
 * blocks. Each block has a `<UniqueID>` source identifier, one or more
 * `<Name>` entries with `<Name1>`…`<Name6>` components, and a record type in
 * `<IndividualEntityShip>` (Individual | Entity | Ship). Blocks are mapped
 * independently so peak memory stays proportional to a single record.
 */

import {
  blank,
  decodeEntities,
  normalizeName,
  textOf,
  type SanctionsAddress,
  type SanctionsAlias,
  type SanctionsIdentifier,
  type SanctionsRecord,
} from "./parse";

/** All complete `<name>…</name>` blocks inside `xml`. */
function blocks(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}\\b[^>]*>[\\s\\S]*?</${name}>`, "g");
  return xml.match(re) ?? [];
}

function textAll(xml: string, name: string): string[] {
  const re = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "g");
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const value = decodeEntities(m[1] ?? "").trim();
    if (value) out.push(value);
  }
  return out;
}

/**
 * UK dates are `dd/mm/yyyy` and may be masked (`dd/mm/1945`, `--/--/1960`).
 * Returns an ISO date plus a precision marker, or null when nothing usable.
 */
function parseUkDate(value: string | null): { date: string | null; precision: "day" | "month" | "year" } | null {
  if (!value) return null;
  const m = /(\d{1,2}|dd|--)\/(\d{1,2}|mm|--)\/(\d{4})/i.exec(value.trim());
  if (!m) return null;
  const [, d, mo, y] = m;
  const dayKnown = /^\d+$/.test(d ?? "");
  const monthKnown = /^\d+$/.test(mo ?? "");
  if (dayKnown && monthKnown) {
    return { date: `${y}-${mo!.padStart(2, "0")}-${d!.padStart(2, "0")}`, precision: "day" };
  }
  if (monthKnown) return { date: `${y}-${mo!.padStart(2, "0")}-01`, precision: "month" };
  return { date: `${y}-01-01`, precision: "year" };
}

/** Full name = Name1…Name6 joined with single spaces. */
function nameFromComponents(nameBlock: string): string | null {
  const parts: string[] = [];
  for (let i = 1; i <= 6; i += 1) {
    const value = textOf(nameBlock, `Name${i}`);
    if (value) parts.push(value);
  }
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined || null;
}

type ParsedName = { full: string; type: string; strength: string | null };

function parseNames(block: string): ParsedName[] {
  const out: ParsedName[] = [];
  for (const nameBlock of blocks(block, "Name")) {
    const full = nameFromComponents(nameBlock);
    if (!full) continue;
    out.push({
      full,
      type: (textOf(nameBlock, "NameType") ?? "").toLowerCase(),
      strength: textOf(nameBlock, "AliasStrength"),
    });
  }
  return out;
}


function parseAddresses(block: string): SanctionsAddress[] {
  const out: SanctionsAddress[] = [];
  for (const addr of blocks(block, "Address")) {
    const lines: string[] = [];
    for (let i = 1; i <= 6; i += 1) {
      const value = textOf(addr, `AddressLine${i}`);
      if (value) lines.push(value);
    }
    const postcode = textOf(addr, "AddressPostalCode");
    const country = textOf(addr, "AddressCountry");
    const full = [...lines, postcode, country].filter(Boolean).join(", ");
    if (!full) continue;
    out.push({
      full_address: full,
      street: lines[0] ?? null,
      city: lines[lines.length - 1] ?? null,
      region: null,
      postcode,
      country,
      country_code: null,
    });
  }
  return out;
}

function parseIdentifiers(block: string, ship: boolean): SanctionsIdentifier[] {
  const out: SanctionsIdentifier[] = [];
  const seen = new Set<string>();
  const push = (type: string, value: string | null) => {
    if (!value) return;
    const key = `${type}|${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ identifier_type: type, identifier_value: value, issuing_country: null, issue_date: null, expiry_date: null });
  };

  for (const passport of blocks(block, "Passport")) push("passport", textOf(passport, "PassportNumber"));
  for (const nid of blocks(block, "NationalIdentifier")) push("national_id", textOf(nid, "NationalIdentifierNumber"));
  for (const reg of textAll(block, "BusinessRegistrationNumber")) push("registration", reg);
  if (ship) for (const imo of textAll(block, "IMONumber")) push("imo", imo);
  push("ofsi_group_id", textOf(block, "OFSIGroupID"));
  push("un_ref", textOf(block, "UNReferenceNumber"));
  return out;
}

function parseRelationships(block: string): SanctionsRecord["relationships"] {
  const out: SanctionsRecord["relationships"] = [];
  for (const name of textAll(block, "ParentCompany")) {
    out.push({ related_source_record_id: null, related_name: name, relationship_type: "parent_company", source_description: "UK Sanctions List parent company" });
  }
  for (const name of textAll(block, "Subsidiary")) {
    out.push({ related_source_record_id: null, related_name: name, relationship_type: "subsidiary", source_description: "UK Sanctions List subsidiary" });
  }
  for (const name of textAll(block, "CurrentOwnerOperator")) {
    out.push({ related_source_record_id: null, related_name: name, relationship_type: "owner_operator", source_description: "UK Sanctions List current owner/operator" });
  }
  for (const name of textAll(block, "PreviousOwnerOperator")) {
    out.push({ related_source_record_id: null, related_name: name, relationship_type: "previous_owner_operator", source_description: "UK Sanctions List previous owner/operator" });
  }
  return out;
}

function shipDetails(block: string): Record<string, unknown> {
  const ship = blocks(block, "Ship")[0];
  if (!ship) return {};
  return {
    imo_numbers: textAll(ship, "IMONumber"),
    current_owner_operators: textAll(ship, "CurrentOwnerOperator"),
    previous_owner_operators: textAll(ship, "PreviousOwnerOperator"),
    current_flag: textAll(ship, "CurrentBelievedFlagOfShip"),
    previous_flags: textAll(ship, "PreviousFlag"),
    ship_types: textAll(ship, "TypeOfShip"),
    tonnage: textAll(ship, "TonnageOfShip"),
    length: textAll(ship, "LengthOfShip"),
    year_built: textAll(ship, "YearBuilt"),
  };
}

/** Map a single `<Designation>…</Designation>` block. */
export function parseDesignation(block: string): SanctionsRecord | null {
  const uniqueId = textOf(block, "UniqueID");
  if (!uniqueId) return null;

  const kind = (textOf(block, "IndividualEntityShip") ?? "").toLowerCase();
  const entityType = kind === "individual" ? "person" : kind === "ship" ? "ship" : "entity";

  const names = parseNames(block);
  const primary = names.find((n) => n.type === "primary name") ?? names[0];
  if (!primary) return null;

  const nonLatin = textAll(block, "NameNonLatinScript");
  const aliases: SanctionsAlias[] = [];
  for (const name of names) {
    if (name === primary) continue;
    const isAlias = name.type.includes("alias");
    aliases.push({
      alias_name: name.full,
      alias_name_normalized: normalizeName(name.full),
      alias_type: isAlias ? "alias" : "primary_variation",
      name_language: null,
      is_primary: false,
    });
  }
  for (const script of nonLatin) {
    aliases.push({
      alias_name: script,
      alias_name_normalized: normalizeName(script),
      alias_type: "original_script",
      name_language: null,
      is_primary: false,
    });
  }

  const designationDate = parseUkDate(textOf(block, "DateDesignated"));
  const lastUpdated = parseUkDate(textOf(block, "LastUpdated"));

  const record: SanctionsRecord = {
    source_record_id: uniqueId,
    entity_type: entityType,
    primary_name: primary.full,
    primary_name_normalized: normalizeName(primary.full),
    name_original_script: nonLatin[0] ?? null,
    sanctions_programme: textOf(block, "RegimeName"),
    legal_basis: textOf(block, "DesignationSource"),
    listing_reason: blank(textOf(block, "UKStatementofReasons")),
    designation_date: designationDate?.date ?? null,
    last_amended_date: lastUpdated?.date ?? null,
    aliases,
    addresses: parseAddresses(block),
    identifiers: parseIdentifiers(block, entityType === "ship"),
    relationships: parseRelationships(block),
    raw: {
      unique_id: uniqueId,
      ofsi_group_id: textOf(block, "OFSIGroupID"),
      un_reference_number: textOf(block, "UNReferenceNumber"),
      record_type: textOf(block, "IndividualEntityShip"),
      regime_name: textOf(block, "RegimeName"),
      designation_source: textOf(block, "DesignationSource"),
      date_designated: textOf(block, "DateDesignated"),
      last_updated: textOf(block, "LastUpdated"),
      uk_statement_of_reasons: blank(textOf(block, "UKStatementofReasons")),
      sanctions_imposed: (textOf(block, "SanctionsImposed") ?? "").split("|").map((s) => s.trim()).filter(Boolean),
      other_information: blank(textOf(block, "OtherInformation")),
      titles: textAll(block, "Title"),
      entity_types: textAll(block, "TypeOfEntity"),
      phone_numbers: textAll(block, "PhoneNumber"),
      email_addresses: textAll(block, "EmailAddress"),
      websites: textAll(block, "Website"),
      name_components: names.map((n) => ({ full: n.full, type: n.type, strength: n.strength })),
      non_latin_names: nonLatin,
      ...(entityType === "ship" ? { ship: shipDetails(block) } : {}),
    },
  };

  if (entityType === "person") {
    const individual = blocks(block, "Individual")[0] ?? "";
    record.person = {
      date_of_birth: textAll(individual, "DOB")
        .map((d) => {
          const parsed = parseUkDate(d);
          return parsed ? { date: parsed.date, datePrecision: parsed.precision, raw: d } : { date: null, datePrecision: "unknown", raw: d };
        }),
      place_of_birth: blocks(individual, "Location").map((loc) => ({
        town: textOf(loc, "TownOfBirth"),
        country: textOf(loc, "CountryOfBirth"),
      })),
      nationalities: textAll(individual, "Nationality"),
      citizenships: [],
      gender: textAll(individual, "Gender")[0] ?? null,
      titles: textAll(block, "Title"),
    };
  }

  return record;
}

/** Yields every `<Designation>` block in document order. */
export function* iterateUkDesignations(xml: string): Generator<SanctionsRecord> {
  const re = /<Designation\b[^>]*>[\s\S]*?<\/Designation>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const record = parseDesignation(m[0]);
    if (record) yield record;
  }
}

/** Structural validation for the UK Sanctions List. */
export function looksLikeUkSanctionsList(xml: string): { ok: boolean; reason?: string } {
  const head = xml.slice(0, 2000);
  if (!/<Designations[\s>]/.test(head)) {
    return { ok: false, reason: "Missing <Designations> root element (not a UK Sanctions List file)." };
  }
  if (/<CONSOLIDATED_LIST[\s>]/.test(head) || /<sanctionEntity[\s>]/.test(xml.slice(0, 5000))) {
    return { ok: false, reason: "File looks like the UN or EU list, not the UK Sanctions List." };
  }
  if (!/<UniqueID>/.test(xml)) return { ok: false, reason: "No <UniqueID> designations found." };
  return { ok: true };
}
