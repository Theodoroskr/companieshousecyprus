/** Shared, client-safe constants and types for the guides section. */

export const GUIDE_SLUG = "register-company-cyprus" as const;

export const CONSENT_VERSION_DOWNLOAD = "guide-download-2026.1";
export const CONSENT_VERSION_INTRODUCTION = "specialist-introduction-2026.1";

export const CONSENT_TEXT_DOWNLOAD =
  "I agree to receive the requested guide and to be contacted regarding my enquiry.";

export const CONSENT_TEXT_INTRODUCTION =
  "I consent to CompaniesHouseCyprus.com reviewing my enquiry and, where appropriate, sharing it with an independent company-formation specialist for the purpose of responding to my request.";

export const TIMEFRAME_OPTIONS = [
  { value: "immediately", label: "Immediately" },
  { value: "30_days", label: "Within 30 days" },
  { value: "3_months", label: "Within 3 months" },
  { value: "6_months", label: "Within 6 months" },
  { value: "researching", label: "Researching at this stage" },
] as const;

export const SERVICE_OPTIONS = [
  "Company formation",
  "Registered office",
  "Company secretary",
  "Tax registration",
  "VAT registration",
  "Bank-account assistance",
  "Accounting",
  "Legal advice",
  "Other",
] as const;

export const SHAREHOLDER_COUNT_OPTIONS = ["1", "2", "3", "4", "5 or more", "Not decided yet"] as const;

export interface GuideEditorial {
  guide_slug: string;
  date_published: string;
  last_reviewed: string;
  reviewer_name: string;
  reviewer_role: string;
  legal_disclaimer: string;
  tax_disclaimer: string;
  official_source_links: Array<{ label: string; url: string }>;
  guide_version: string;
}

export interface GuideFee {
  label: string;
  amount: string;
  note: string | null;
  source_url: string | null;
  last_verified: string | null;
  needs_verification: boolean;
}
