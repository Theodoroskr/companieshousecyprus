/** Shared, client-safe constants for the /company-set-up lead-generation page. */

export const COMPANY_SETUP_FORM_SOURCE = "company-set-up";
export const COMPANY_SETUP_LEAD_LABEL = "Company Set-Up Page";
export const COMPANY_SETUP_CONSENT_VERSION = "company-set-up-2026.1";

export const CONSENT_TEXT_PRIVACY =
  "I have read the Privacy Policy and agree that Infocredit Group Ltd may process my information to review and respond to this enquiry.";

export const CONSENT_TEXT_SHARING =
  "I authorise Infocredit Group Ltd to share my enquiry with an appropriate independent company-formation professional for the purpose of responding to my request.";

export const CONSENT_TEXT_MARKETING =
  "I would like to receive relevant business information, guides and service updates.";

export const SETUP_TIMEFRAME_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "within_1_month", label: "Within one month" },
  { value: "within_3_months", label: "Within three months" },
  { value: "exploring", label: "I am exploring options" },
] as const;

export const YES_NO_UNSURE_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "not_sure", label: "Not sure" },
] as const;

export const COUNT_OPTIONS = ["1", "2", "3", "4", "5 or more", "Not decided yet"] as const;

export const SETUP_SERVICE_OPTIONS = [
  "Company incorporation",
  "Company-name approval",
  "Registered office",
  "Company secretary",
  "Director services",
  "Accounting and audit",
  "Tax registration",
  "VAT registration",
  "Bank or payment-account assistance",
  "Work permits or relocation",
  "Trademark registration",
  "Not sure — I need advice",
] as const;

export function setupTimeframeLabel(value: string) {
  return SETUP_TIMEFRAME_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function yesNoLabel(value: string) {
  return YES_NO_UNSURE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
