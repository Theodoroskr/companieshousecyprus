/**
 * API4ALL product-code mapping and company-code resolution.
 *
 * Pure logic only (no network, no secrets) so it can be unit tested.
 */

export type A4AReportKind = "structure" | "credit";

/**
 * API4ALL product codes.
 * Cyprus Company Profile (structure) = 2200, Cyprus Credit Report = 2300.
 */
export const REPORT_PRODUCTS: Record<A4AReportKind, string> = {
  structure: "2200",
  credit: "2300",
};

/** Which of our catalogue products are fulfilled through API4ALL. */
export const A4A_PRODUCT_KIND: Record<string, A4AReportKind> = {
  "cyprus-company-profile": "structure",
  "cyprus-credit-report": "credit",
};

/** Report kind for a catalogue product slug, or null when we fulfil it ourselves. */
export function reportKindForProduct(slug: string): A4AReportKind | null {
  return A4A_PRODUCT_KIND[slug] ?? null;
}

/** API4ALL product code for a catalogue product slug. */
export function productCodeForSlug(slug: string): string | null {
  const kind = reportKindForProduct(slug);
  return kind ? REPORT_PRODUCTS[kind] : null;
}

/** Digits of a registrar registration number, e.g. "C4404" -> "4404". */
export function registrationDigits(regNo: string): string {
  return (regNo ?? "").replace(/\D/g, "");
}

export type CodedHit = { code: string | null; regNo?: string | null };

/**
 * Pick the API4ALL company code (e.g. CY00001234406861) matching a registrar
 * registration number (e.g. C4404). Prefers an exact registration-number match,
 * then falls back to the first hit that carries a code.
 */
export function pickCompanyCode(hits: CodedHit[], regNo: string): string | null {
  const digits = registrationDigits(regNo);
  const exact = hits.find(
    (hit) => hit.code && hit.regNo && registrationDigits(hit.regNo) === digits && digits !== "",
  );
  return exact?.code ?? hits.find((hit) => hit.code)?.code ?? null;
}
