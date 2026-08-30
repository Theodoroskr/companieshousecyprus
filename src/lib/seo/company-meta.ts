// Title & meta description templates for /company/$slug pages.
//
// Optimised for company-name queries ("NOVARDIA CREDIT INSURANCE BROKERS LTD"):
// the entity name always comes first, the number disambiguates, and the
// description promises the data categories searchers want (officers,
// registered office, status, history) because those words drive the click.
//
// Hard limits: titles aim for ≤ 60 chars, descriptions ≤ 155 chars. The name
// itself is never truncated — when the name is long we drop suffixes first.

export interface CompanyTitleInput {
  name: string;
  officialNo: string;
}

export interface CompanyDescriptionInput {
  name: string;
  officialNo: string;
  status?: string | null;
  statusGroup?: string | null;
  typeEn?: string | null;
  districtEn?: string | null;
  registrationDate?: string | null;
  businessName?: boolean;
}

const TITLE_SUFFIX = " — Cyprus company profile";
const TITLE_BRAND = " | Companies House Cyprus";
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

function truncateTitle(title: string): string {
  if (title.length <= TITLE_MAX + 4) return title;
  const cut = title.slice(0, TITLE_MAX + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 20 ? lastSpace : TITLE_MAX + 1).trimEnd()}…`;
}

function clampDescription(text: string): string {
  if (text.length <= DESCRIPTION_MAX) return text;
  const cut = text.slice(0, DESCRIPTION_MAX - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : DESCRIPTION_MAX - 1).trimEnd()}…`;
}

/**
 * <title> for a company profile.
 * Name first for exact-match queries; add the number and topic suffix when
 * they fit, brand only when there is still room.
 */
export function companyTitle({ name, officialNo }: CompanyTitleInput): string {
  const withSuffix = `${name}${TITLE_SUFFIX}`;
  const withBrand = `${withSuffix}${TITLE_BRAND}`;
  if (withBrand.length <= TITLE_MAX) return withBrand;
  if (withSuffix.length <= TITLE_MAX) return withSuffix;
  const withNumber = `${name} (${officialNo})`;
  if (withNumber.length <= TITLE_MAX) return withNumber;
  return truncateTitle(name);
}

/**
 * Meta description for a company profile.
 * Leads with the differentiators (officers, office, status) then grounds the
 * entity with type, district and status. Degrades gracefully for long names.
 */
export function companyDescription({
  name,
  officialNo,
  status,
  statusGroup,
  typeEn,
  districtEn,
  businessName,
}: CompanyDescriptionInput): string {
  const statusText = status ?? (statusGroup === "active" ? "Active" : null);
  const statusPhrase = statusText ? ` Status: ${statusText}.` : "";
  const officerWord = businessName ? "Owner" : "Directors, secretary";

  const full =
    `${officerWord}, registered office and filing history for ${name} (${officialNo})` +
    (typeEn ? `, a ${typeEn}` : "") +
    (districtEn ? ` in ${districtEn}, Cyprus` : "") +
    `.${statusPhrase}`;
  if (full.length <= DESCRIPTION_MAX) return full;

  const noDistrict =
    `${officerWord}, registered office and filing history for ${name} (${officialNo})` +
    (typeEn ? `, a Cyprus ${typeEn}` : "") +
    `.${statusPhrase}`;
  if (noDistrict.length <= DESCRIPTION_MAX) return noDistrict;

  const minimal = `Official Cyprus registry record for ${name} (${officialNo}).${statusPhrase}`;
  return clampDescription(minimal);
}
