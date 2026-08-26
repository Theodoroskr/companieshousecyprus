/**
 * Browser-safe helpers for presenting the restrictive measures published by a
 * designating authority (e.g. "Asset freeze", "Trust Services Sanctions",
 * "Director Disqualification Sanction" on the UK Sanctions List).
 *
 * These are facts published about the listed record; they say nothing about
 * whether our identity match is confirmed.
 */

const MEASURE_KEYS = [
  "sanctions_imposed",
  "sanctions_measures",
  "measures",
  "restrictive_measures",
  "programs",
  "program_list",
  "programmes",
];

const NOTE_KEYS = ["other_information", "additional_information", "remarks"];

function pickRaw(rawRecord: unknown): Record<string, unknown> | null {
  if (!rawRecord || typeof rawRecord !== "object") return null;
  const outer = rawRecord as Record<string, unknown>;
  const inner = outer["raw"];
  return inner && typeof inner === "object" ? (inner as Record<string, unknown>) : outer;
}

/** Restrictive measures published for the listed record, de-duplicated. */
export function extractMeasures(rawRecord: unknown): string[] {
  const raw = pickRaw(rawRecord);
  if (!raw) return [];
  const out: string[] = [];
  for (const key of MEASURE_KEYS) {
    const value = raw[key];
    if (Array.isArray(value)) {
      for (const v of value) if (typeof v === "string" && v.trim()) out.push(v.trim());
    } else if (typeof value === "string" && value.trim()) {
      out.push(value.trim());
    }
  }
  return Array.from(new Set(out));
}

/** Free-text note published alongside the measures, when the source provides one. */
export function extractMeasuresNote(rawRecord: unknown): string | null {
  const raw = pickRaw(rawRecord);
  if (!raw) return null;
  for (const key of NOTE_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}
