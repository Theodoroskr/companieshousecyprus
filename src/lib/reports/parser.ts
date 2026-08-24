/**
 * Typed reader for API4ALL v3 report payloads (structure + credit).
 *
 * Stored shape on order_items.report_json is either
 *   { placement, report: { ICGId, Company: [ {...} ], GeneratedAt } }
 * or the raw report object itself (push callback).
 * Everything is defensive: API4ALL omits or empties sections per company.
 */

type Json = Record<string, unknown>;

const asObject = (value: unknown): Json => (value && typeof value === "object" && !Array.isArray(value) ? (value as Json) : {});
const asArray = (value: unknown): Json[] =>
  Array.isArray(value) ? value.filter((row): row is Json => !!row && typeof row === "object" && !Array.isArray(row)) : [];
const str = (value: unknown): string => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const num = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return null;
};
const clean = (value: string) => (value && value !== "-" ? value : "");

export type ReportAddress = {
  type: string;
  active: boolean;
  line: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type ReportParty = {
  name: string;
  isCompany: boolean;
  position: string;
  nationality: string;
  birthDate: string;
  startDate: string;
  endDate: string;
  active: boolean;
  identifier: string;
  shares: string;
  sharesPercentage: string;
  address: string;
};

export type ReportName = {
  name: string;
  latin: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
};

export type ReportCapital = {
  currency: string;
  nominalShares: string;
  issuedShares: string;
  nominalPrice: string;
  authorisedCapital: string;
  paidUpCapital: string;
  referenceDate: string;
};

export type ReportCharge = {
  kind: "Charge" | "Mortgage";
  type: string;
  amount: string;
  currency: string;
  beneficiary: string;
  datePrepared: string;
  dateRegistered: string;
  endDate: string;
};

export type RelatedCompany = {
  name: string;
  registrationNumber: string;
  percentage: string;
  status: string;
  address: string;
  registrationDate: string;
  role: "Parent" | "Subsidiary" | "Affiliate";
};

export type ScoringRow = {
  year: number | null;
  score: number | null;
  description: string;
  creditLimit: string;
  estimatedAt: string;
};

export type FinancialLine = { name: string; value: number | null; emphasis: boolean };
export type FinancialGroup = { heading: string; lines: FinancialLine[] };
export type FinancialStatement = {
  year: string;
  type: string;
  currency: string;
  groups: FinancialGroup[];
};

export type RatioBlock = { heading: string; entries: { name: string; value: number | null }[] };
export type RatioSet = { year: string; type: string; blocks: RatioBlock[] };

export type ParsedReport = {
  kind: "structure" | "credit";
  icgId: string;
  generatedAt: string;
  general: {
    name: string;
    latinName: string;
    registrationNumber: string;
    vatNumber: string;
    status: string;
    legalType: string;
    website: string;
    email: string;
    phone: string;
    dateUpdated: string;
    dates: { label: string; date: string }[];
    addresses: ReportAddress[];
  };
  names: ReportName[];
  identifiers: { description: string; number: string }[];
  activities: { code: string; type: string; description: string }[];
  activityNotes: string[];
  administrators: ReportParty[];
  shareholders: ReportParty[];
  ubo: ReportParty[];
  capitals: ReportCapital[];
  charges: ReportCharge[];
  related: RelatedCompany[];
  branches: RelatedCompany[];
  scoring: ScoringRow[];
  ratios: RatioSet[];
  balanceSheets: FinancialStatement[];
  incomeStatements: FinancialStatement[];
  negatives: { unpaidBills: number; bankruptcies: number };
  detrimental: { label: string; company: string; registrationNumber: string; detail: string }[];
  hasFinancials: boolean;
};

function formatAddress(row: Json): ReportAddress {
  const line = [clean(str(row["Address"])), clean(str(row["PoBox"])) ? `P.O. Box ${str(row["PoBox"])}` : ""]
    .filter(Boolean)
    .join(", ");
  return {
    type: str(row["Type"]) || "Address",
    active: num(row["Active"]) === 1,
    line,
    city: clean(str(row["City"])),
    region: clean(str(row["Region"])),
    postalCode: clean(str(row["PostalCode"])),
    country: clean(str(row["Country"])),
  };
}

export function addressToString(address?: ReportAddress | null): string {
  if (!address) return "";
  return [address.line, address.city, address.postalCode, address.region, address.country]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join(", ");
}

function party(row: Json): ReportParty {
  const isCompany = num(row["IsCompany"]) === 1;
  const person = [str(row["FirstName"]), str(row["MiddleName"]), str(row["LastName"])].filter(Boolean).join(" ");
  const identifiers = asArray(row["Identifier"]);
  const first = asArray(row["Address"]).map(formatAddress)[0];
  return {
    name: (isCompany ? str(row["CompanyName"]) : person) || str(row["CompanyName"]) || person || "—",
    isCompany,
    position: str(row["Position"]),
    nationality: str(row["Nationality"]),
    birthDate: str(row["BirthDate"]),
    startDate: str(row["StartDate"]),
    endDate: str(row["EndDate"]),
    active: num(row["Active"]) !== 0,
    identifier: identifiers.map((id) => `${str(id["Description"])} ${str(id["Number"])}`.trim()).join(" · "),
    shares: str(row["IssuedShares"]),
    sharesPercentage: str(row["SharesPercentage"]),
    address: addressToString(first),
  };
}

function relatedCompany(row: Json, role: RelatedCompany["role"]): RelatedCompany {
  const status = asArray(row["Status"]).map((entry) => str(entry["Description"])).filter(Boolean)[0] ?? "";
  const inline = addressToString(formatAddress(row));
  const nested = asArray(row["Address"]).map(formatAddress)[0];
  return {
    name: str(row["CompanyName"]) || "—",
    registrationNumber: str(row["RegistrationNumber"]),
    percentage: str(row["Percentage"]),
    status,
    address: inline || addressToString(nested),
    registrationDate: str(row["RegistrationDate"]),
    role,
  };
}

function statementGroups(statement: unknown): FinancialGroup[] {
  const groups: FinancialGroup[] = [];
  const walk = (node: unknown, heading: string) => {
    if (Array.isArray(node)) {
      const lines = node
        .filter((row): row is Json => !!row && typeof row === "object")
        .map((row) => ({
          name: str(row["name"]) || str(row["key"]) || "—",
          value: num(row["value"]),
          emphasis: /^total|^net income$/i.test(str(row["name"])) || !!str(row["key"]),
        }));
      if (lines.length) groups.push({ heading, lines });
      return;
    }
    const object = asObject(node);
    for (const [key, value] of Object.entries(object)) {
      walk(value, heading ? `${heading} — ${key}` : key);
    }
  };
  walk(statement, "");
  return groups;
}

function financials(rows: Json[]): FinancialStatement[] {
  return rows
    .map((row) => ({
      year: str(row["year"]),
      type: str(row["type"]),
      currency: str(row["currency"]) || "EUR",
      groups: statementGroups(row["statement"]),
    }))
    .filter((entry) => entry.groups.length > 0)
    .sort((a, b) => b.year.localeCompare(a.year));
}

function ratioSets(rows: Json[]): RatioSet[] {
  return rows
    .map((row) => ({
      year: str(row["year"]),
      type: str(row["type"]),
      blocks: Object.entries(asObject(row["ratios"])).map(([heading, value]) => ({
        heading,
        entries: Object.entries(asObject(value)).map(([name, raw]) => ({ name, value: num(raw) })),
      })),
    }))
    .filter((entry) => entry.blocks.length > 0)
    .sort((a, b) => b.year.localeCompare(a.year));
}

/** Unwrap the stored payload down to the first Company object. */
export function reportRoot(stored: unknown): { company: Json; icgId: string; generatedAt: string } | null {
  const outer = asObject(stored);
  const report = asObject(outer["report"] ?? outer["data"] ?? outer);
  const companies = asArray(report["Company"]);
  const company = companies[0];
  if (!company) return null;
  return { company, icgId: str(report["ICGId"]), generatedAt: str(report["GeneratedAt"]) };
}

export function parseReport(stored: unknown, kind: "structure" | "credit"): ParsedReport | null {
  const root = reportRoot(stored);
  if (!root) return null;
  const c = root.company;

  const general = asArray(c["GeneralInfo"])[0] ?? {};
  const moreInfo = asArray(c["MoreInfo"])[0] ?? {};
  const negatives = asArray(c["Negatives"])[0] ?? {};
  const detrimentalRow = asArray(c["CorporateStructureDetrimental"])[0] ?? {};

  const detrimental: ParsedReport["detrimental"] = [];
  for (const [label, value] of Object.entries(detrimentalRow)) {
    for (const row of asArray(value)) {
      detrimental.push({
        label: label.replace(/^LegalEntities-/, "").replace(/([a-z])([A-Z])/g, "$1 $2"),
        company: str(row["CompanyName"]),
        registrationNumber: str(row["RegNumber"]) || str(row["RegistrationNumber"]),
        detail: str(row["Status"]) || str(row["Amount"]) || "",
      });
    }
  }

  const mortgageRow = asArray(c["MortgagesCharges"])[0] ?? {};
  const charges: ReportCharge[] = [
    ...asArray(mortgageRow["Charges"]).map((row) => ({ kind: "Charge" as const, row })),
    ...asArray(mortgageRow["Mortgages"]).map((row) => ({ kind: "Mortgage" as const, row })),
  ].map(({ kind: chargeKind, row }) => ({
    kind: chargeKind,
    type: str(row["Type"]),
    amount: str(row["Amount"]),
    currency: str(row["Currency"]) || "EUR",
    beneficiary: str(row["Beneficiary"]),
    datePrepared: str(row["DatePrepared"]),
    dateRegistered: str(row["DateRegistered"]),
    endDate: str(row["EndDate"]),
  }));

  const activityRow = asArray(c["Activities"])[0] ?? {};

  const balanceSheets = financials(asArray(c["StatementOfFinancialPosition"]));
  const incomeStatements = financials(asArray(c["StatementOfProfitAndLoss"]));

  return {
    kind,
    icgId: root.icgId,
    generatedAt: root.generatedAt,
    general: {
      name: str(general["Name"]),
      latinName: str(general["NameInLatinCharacters"]),
      registrationNumber: str(general["RegistrationNumber"]),
      vatNumber: str(general["VATNumber"]),
      status: asArray(general["Status"]).map((row) => str(row["Description"])).filter(Boolean)[0] ?? "",
      legalType: asArray(general["LegalType"]).map((row) => str(row["Description"])).filter(Boolean)[0] ?? "",
      website: str(general["Website"]),
      email: str(moreInfo["Emails"]),
      phone: str(moreInfo["Phones"]),
      dateUpdated: str(general["DateUpdated"]),
      dates: asArray(general["CompanyDates"])
        .map((row) => ({ label: str(row["Description"]), date: str(row["Date"]) }))
        .filter((row) => row.date),
      addresses: asArray(general["Address"]).map(formatAddress),
    },
    names: asArray(c["Names"]).map((row) => ({
      name: str(row["Name"]),
      latin: str(row["NameInLatinCharacters"]),
      description: str(row["Description"]),
      status: str(row["Status"]),
      startDate: str(row["StartDate"]),
      endDate: str(row["EndDate"]),
    })),
    identifiers: [...asArray(c["Identifiers"])].map((row) => ({
      description: str(row["Description"]),
      number: str(row["Number"]),
    })),
    activities: asArray(activityRow["ActivityCode"]).map((row) => ({
      code: str(row["Code"]),
      type: str(row["Type"]),
      description: str(row["Description"]),
    })),
    activityNotes: asArray(activityRow["AdditionalInfo"]).map((row) => str(row["Notes"])).filter(Boolean),
    administrators: asArray(c["Administrators"]).map(party),
    shareholders: asArray(c["Shareholders"]).map(party),
    ubo: asArray(c["UltimateBeneficialOwner"]).map(party),
    capitals: asArray(c["Capitals"]).map((row) => ({
      currency: str(row["Currency"]) || "EUR",
      nominalShares: str(row["NominalShares"]),
      issuedShares: str(row["IssuedShares"]),
      nominalPrice: str(row["NominalPrice"]),
      authorisedCapital: str(row["AuthorisedCapital"]),
      paidUpCapital: str(row["PaidUpCapital"]),
      referenceDate: str(row["ReferenceDate"]),
    })),
    charges,
    related: [
      ...asArray(c["ParentCompany"]).map((row) => relatedCompany(row, "Parent")),
      ...asArray(c["Subsidiaries"]).map((row) => relatedCompany(row, "Subsidiary")),
      ...asArray(c["Affiliates"]).map((row) => relatedCompany(row, "Affiliate")),
    ],
    branches: [
      ...asArray(c["Branches"]).map((row) => relatedCompany(row, "Subsidiary")),
      ...asArray(c["BranchParent"]).map((row) => relatedCompany(row, "Parent")),
    ],
    scoring: asArray(c["ICGScoring"])
      .map((row) => ({
        year: num(row["FinancialYear"]),
        score: num(row["Score"]),
        description: str(row["Description"]),
        creditLimit: str(row["CreditLimit"]),
        estimatedAt: str(row["EstimatedAt"]),
      }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
    ratios: ratioSets(asArray(c["KeyRatios"])),
    balanceSheets,
    incomeStatements,
    negatives: {
      unpaidBills: asArray(negatives["UnpaidBills"]).length,
      bankruptcies: asArray(negatives["Bankruptcies"]).length,
    },
    detrimental,
    hasFinancials: balanceSheets.length > 0 || incomeStatements.length > 0,
  };
}

/** Money/number formatting used across the report renderer. */
export function reportNumber(value: number | null, currency?: string): string {
  if (value === null) return "—";
  const formatted = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
  return currency ? `${currency === "EUR" ? "€" : `${currency} `}${formatted}` : formatted;
}
