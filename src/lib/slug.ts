// Registry slugs are stored uppercase and ID-shaped (e.g. "C4404", "B40076").
// Incoming URLs may be lowercase or use the legacy pretty form
// "infocredit-group-limited-c4404" — normalise both to the stored key.
export function normalizeCompanySlug(input: string): string {
  const raw = (input ?? "").trim().toUpperCase();
  if (!raw) return raw;
  if (raw.includes("-")) {
    const last = raw.split("-").filter(Boolean).pop() ?? raw;
    if (/^[A-Z]{0,2}\d+$/.test(last)) return last;
  }
  return raw;
}
