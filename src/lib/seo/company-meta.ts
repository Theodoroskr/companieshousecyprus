// Title / meta-description templates for company profile pages.
// Kept field-driven: any missing field is omitted rather than leaving an empty
// gap in the snippet (the failure mode of the old WordPress templates).

const TITLE_MAX = 62;
const DESCRIPTION_MAX = 155;

export type CompanyMetaInput = {
  name: string;
  officialNo?: string | null;
  status?: string | null;
  statusGroup?: string | null;
  typeEn?: string | null;
  districtEn?: string | null;
  registrationDate?: string | null; // already formatted for display (dd/mm/yyyy)
};

function cut(value: string, max: number): string {
  if (value.length <= max) return value;
  const sliced = value.slice(0, max - 1);
  const boundary = sliced.lastIndexOf(" ");
  return `${(boundary > max * 0.6 ? sliced.slice(0, boundary) : sliced).replace(/[\s,.;:—-]+$/, "")}…`;
}

export function plainStatus(statusGroup?: string | null, statusEn?: string | null): string | null {
  switch ((statusGroup ?? "").toLowerCase()) {
    case "active":
      return "Active";
    case "dissolved":
      return "Dissolved";
    case "struck-off":
    case "struck_off":
      return "Struck off";
    case "overdue":
    case "filing-overdue":
      return "Filing overdue";
    default:
      break;
  }
  const raw = (statusEn ?? "").trim();
  if (!raw) return null;
  if (/reminder|overdue|non[- ]?compliant/i.test(raw)) return "Filing overdue";
  if (/dissolv/i.test(raw)) return "Dissolved";
  if (/strike|struck/i.test(raw)) return "Struck off";
  if (/^registered$|active/i.test(raw)) return "Active";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

export function companyTitle(input: CompanyMetaInput): string {
  const label = (input.officialNo ?? "").trim();
  const base = label ? `${input.name} — ${label}` : input.name;
  const full = `${base} | Cyprus company register`;
  if (full.length <= TITLE_MAX) return full;
  // Never truncate the company name: drop the suffix first, then the number.
  if (base.length <= TITLE_MAX) return base;
  return cut(input.name, TITLE_MAX);
}

export function companyDescription(input: CompanyMetaInput): string {
  const label = (input.officialNo ?? "").trim();
  const head = label ? `${input.name} (${label})` : input.name;

  const type = (input.typeEn ?? "").trim().toLowerCase();
  const place = (input.districtEn ?? "").trim();
  const date = (input.registrationDate ?? "").trim();

  const parts: string[] = [];
  parts.push(type ? `${type} registered in ${place ? `${place}, Cyprus` : "Cyprus"}` : `registered in ${place ? `${place}, Cyprus` : "Cyprus"}`);
  if (date) parts.push(`on ${date}`);

  const status = plainStatus(input.statusGroup, input.status);
  const first = `${head} — ${parts.join(" ")}.`;
  const second = status
    ? `${status}. Registered office, officials and certificates available to order.`
    : `Registered office, officials and certificates available to order.`;

  return cut(`${first} ${second}`, DESCRIPTION_MAX);
}
