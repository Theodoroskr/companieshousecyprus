// Browser-safe mapping of Cyprus Registrar CSV exports to our table shape.
// Mirrors the reference ETL script so admin uploads produce identical rows.

export const VALID_TYPES = ["C", "B", "P", "O", "N"] as const;

export const TYPE_EN: Record<string, string> = {
  C: "Company",
  B: "Business Name",
  P: "Partnership",
  O: "Overseas Company",
  N: "Partnership (BN)",
};

export const OFFICIAL_PREFIX: Record<string, string> = {
  C: "HE",
  P: "S",
  B: "EE",
  O: "AE",
  N: "BN",
};

export const SUBTYPE_EN: Record<string, string> = {
  "Ιδιωτική": "Private",
  "Δημόσια": "Public",
  "Ομόρρυθμος": "General",
  "Ετερόρρυθμος": "Limited",
  "Δι΄ Εγγυήσεως": "Limited by guarantee",
  "Δι΄ Εγγυήσεως Χωρίς Κεφάλαιο": "Limited by guarantee without share capital",
};

export const STATUS_EN: Record<string, [string, string]> = {
  "Εγγεγραμμένη": ["Registered", "active"],
  "Στάληκε επιστολή Υπενθύμισης": ["Reminder letter sent", "at_risk"],
  "Δημοσιεύτηκε η Τρίμηνη": ["Three-month strike-off notice published", "at_risk"],
  "Διαγραμμένη": ["Struck off", "struck_off"],
  "Εκούσια Εκκαθάριση από Μετόχους": ["Members' voluntary liquidation", "liquidation"],
  "Εκούσια Εκκαθάριση από Πιστωτές": ["Creditors' voluntary liquidation", "liquidation"],
  "Εκκαθάριση με Διάταγμα Δικαστηρίου": ["Liquidation by court order", "liquidation"],
  "Εκκαθάριση με Διάταγμα Δικαστηρίου& Διορ.Ειδικού Διαχειριστή": [
    "Liquidation by court order, special administrator appointed",
    "liquidation",
  ],
  "Υπο Εκκαθάριση": ["Under liquidation", "liquidation"],
  "Υπο Διαχείριση": ["Under administration", "liquidation"],
  "Υπο Διαχείριση & Υπο Εκκαθάριση": ["Under administration and liquidation", "liquidation"],
  "Διορισμός Προσωρινού Εκκαθαριστή": ["Provisional liquidator appointed", "liquidation"],
  "Διάλυση λόγω Ολοκλήρωσης Εκούσιας Εκκαθάρισης": [
    "Dissolved on completion of voluntary liquidation",
    "dissolved",
  ],
  "Διάλυση λόγω Ολοκλήρωσης Εκκαθάρισης": ["Dissolved on completion of liquidation", "dissolved"],
  "Διαλύθηκε λόγω συγχώνευσης": ["Dissolved following merger", "dissolved"],
  "Αφαιρέθηκε από το Μητρώο ΕΕ με απόφαση Ανωτάτου Δικαστηρίου": [
    "Removed from the register by Supreme Court decision",
    "dissolved",
  ],
  "Ευρωπαϊκή Εταιρεία": ["European Company (SE)", "active"],
};

export const POSITION_EN: Record<string, string> = {
  "Διευθυντής": "Director",
  "Γραμματέας": "Secretary",
  "Ιδιοκτήτης": "Owner",
  "Ομόρρυθμος Συνέταιρος": "General Partner",
  "Ετερόρρυθμος Συνέταιρος": "Limited Partner",
  "Αντικαταστάτης Διευθυντής": "Alternate Director",
  "Βοηθός Γραμματέας": "Assistant Secretary",
  "Αναπληρωτής Γραμματέας": "Deputy Secretary",
  "Εξουσιοδοτημένο Πρόσωπο": "Authorised Person",
};

export const DISTRICT_EN: Record<string, string> = {
  "Λευκωσία": "Nicosia",
  Nicosia: "Nicosia",
  Lefkosa: "Nicosia",
  "Lefkoşa": "Nicosia",
  "Λεμεσός": "Limassol",
  Limassol: "Limassol",
  "Λάρνακα": "Larnaca",
  Larnaca: "Larnaca",
  "Πάφος": "Paphos",
  Paphos: "Paphos",
  "Αμμόχωστος": "Famagusta",
  Famagusta: "Famagusta",
  Magusa: "Famagusta",
  "Mağusa": "Famagusta",
  "Κερύνεια": "Kyrenia",
  Kyrenia: "Kyrenia",
  Girne: "Kyrenia",
};

const POSTCODE_RE = /^\d{4}$/;

export function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\s+/g, " ").trim().replace(/,+$/, "").trim();
  return s || null;
}

export function parseDate(value: unknown): string | null {
  const s = value === null || value === undefined ? "" : String(value).trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return null;
  const [d, m, y] = s.split("/");
  return `${y}-${m}-${d}`;
}

export function parseTerritory(t: unknown): {
  locality: string | null;
  postcode: string | null;
  district: string | null;
} {
  if (!t) return { locality: null, postcode: null, district: null };
  const parts = String(t)
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && p !== "Κύπρος" && p !== "Cyprus");
  if (parts.length === 0) return { locality: null, postcode: null, district: null };
  const postcode = parts.find((p) => POSTCODE_RE.test(p)) ?? null;
  const rest = parts.filter((p) => !POSTCODE_RE.test(p));
  if (rest.length === 0) return { locality: null, postcode, district: null };
  const district = rest[rest.length - 1] ?? null;
  const locality = rest.slice(0, -1).join(", ") || null;
  return { locality, postcode, district };
}

export type AddressRecord = {
  street: string | null;
  building: string | null;
  locality: string | null;
  postcode: string | null;
  district_el: string | null;
  district_en: string | null;
  is_foreign_address: boolean;
  address_full: string | null;
};

export function mapAddressRow(row: Record<string, string>): { seq: string; address: AddressRecord } | null {
  const seq = cleanText(row["ADDRESS_SEQ_NO"]);
  if (!seq) return null;
  const street = cleanText(row["STREET"]);
  const building = cleanText(row["BUILDING"]);
  const { locality, postcode, district } = parseTerritory(row["TERRITORY"]);
  const districtEn = district ? (DISTRICT_EN[district] ?? null) : null;
  const addressFull =
    [street, building, locality, postcode, districtEn ?? district].filter(Boolean).join(", ") || null;
  return {
    seq,
    address: {
      street,
      building,
      locality,
      postcode,
      district_el: district,
      district_en: districtEn,
      is_foreign_address: Boolean(district) && !districtEn,
      address_full: addressFull,
    },
  };
}

export type CompanyImportRow = {
  slug: string;
  type_code: string;
  reg_number: number;
  official_no: string | null;
  name: string;
  type_el: string | null;
  type_en: string | null;
  subtype_el: string | null;
  subtype_en: string | null;
  status_el: string | null;
  status_en: string | null;
  status_group: string;
  registration_date: string | null;
  status_date: string | null;
} & Partial<AddressRecord>;

export function mapOrganisationRow(
  row: Record<string, string>,
  addresses?: Map<string, AddressRecord>,
): CompanyImportRow | null {
  const typeCode = cleanText(row["ORGANISATION_TYPE_CODE"]);
  const regNo = cleanText(row["REGISTRATION_NO"]);
  const name = cleanText(row["ORGANISATION_NAME"]);
  if (!typeCode || !regNo || !name) return null;
  if (!(VALID_TYPES as readonly string[]).includes(typeCode)) return null;
  if (!/^\d+$/.test(regNo)) return null;

  const statusEl = cleanText(row["ORGANISATION_STATUS"]);
  const status = statusEl ? STATUS_EN[statusEl] : undefined;
  const subtypeEl = cleanText(row["ORGANISATION_SUB_TYPE"]);

  const mapped: CompanyImportRow = {
    slug: `${typeCode}${regNo}`,
    type_code: typeCode,
    reg_number: Number(regNo),
    official_no: OFFICIAL_PREFIX[typeCode] ? `${OFFICIAL_PREFIX[typeCode]}${regNo}` : null,
    name,
    type_el: cleanText(row["ORGANISATION_TYPE"]),
    type_en: TYPE_EN[typeCode] ?? null,
    subtype_el: subtypeEl,
    subtype_en: subtypeEl ? (SUBTYPE_EN[subtypeEl] ?? null) : null,
    status_el: statusEl,
    status_en: status ? status[0] : null,
    status_group: status ? status[1] : "unknown",
    registration_date: parseDate(row["REGISTRATION_DATE"]),
    status_date: parseDate(row["ORGANISATION_STATUS_DATE"]),
  };

  const seq = cleanText(row["ADDRESS_SEQ_NO"]);
  const address = seq && addresses ? addresses.get(seq) : undefined;
  if (address) Object.assign(mapped, address);
  return mapped;
}

export type OfficialImportRow = {
  slug: string;
  person_name: string;
  position_el: string | null;
  position_en: string | null;
};

export function mapOfficialRow(row: Record<string, string>): OfficialImportRow | null {
  const typeCode = cleanText(row["ORGANISATION_TYPE_CODE"]);
  const regNo = cleanText(row["REGISTRATION_NO"]);
  const personName = cleanText(row["PERSON_OR_ORGANISATION_NAME"] ?? row["PERSON_OR_ORGANISATION"]);
  if (!typeCode || !regNo || !personName) return null;
  if (!(VALID_TYPES as readonly string[]).includes(typeCode)) return null;
  if (!/^\d+$/.test(regNo)) return null;
  const positionEl = cleanText(row["OFFICIAL_POSITION"]);
  return {
    slug: `${typeCode}${regNo}`,
    person_name: personName,
    position_el: positionEl,
    position_en: positionEl ? (POSITION_EN[positionEl] ?? null) : null,
  };
}
