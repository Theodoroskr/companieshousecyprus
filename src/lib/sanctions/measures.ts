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

const AMENDMENT_KEYS = ["last_amended_date", "last_amended", "amended_date", "last_modified_date"];

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

export type MeasureAvailability = "present" | "not_published" | "record_missing";

/**
 * Whether the source record actually carries measure/amendment data.
 *
 * - "present" — at least one measure, note or amendment date was found.
 * - "not_published" — the raw record exists, but none of the expected authority
 *   fields are populated. This is a source-data gap, not an extraction failure.
 * - "record_missing" — no raw record could be loaded, so we cannot tell whether
 *   the authority published measures. Treat as an extraction/import issue.
 */
export function measureAvailability(rawRecord: unknown): MeasureAvailability {
  const raw = pickRaw(rawRecord);
  if (!raw || Object.keys(raw).length === 0) return "record_missing";

  for (const key of MEASURE_KEYS) {
    const value = raw[key];
    if (Array.isArray(value)) {
      if (value.some((v) => typeof v === "string" && v.trim())) return "present";
    } else if (typeof value === "string" && value.trim()) {
      return "present";
    }
  }

  for (const key of NOTE_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return "present";
  }

  for (const key of AMENDMENT_KEYS) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return "present";
  }

  return "not_published";
}

/**
 * Plain-language explanation of a published measure, primarily for the UK
 * Sanctions List vocabulary. Returns null when we have no vetted wording — we
 * never invent an interpretation of an official measure.
 */
export function describeMeasure(measure: string): string | null {
  const m = measure.toLowerCase();
  if (m.includes("asset freeze")) {
    return "Funds and economic resources owned, held or controlled by the listed record must be frozen. No funds or economic resources may be made available to it, directly or indirectly, without a licence.";
  }
  if (m.includes("trust service")) {
    return "Trust services sanction: it is prohibited to provide trust or company services (such as acting as trustee, nominee shareholder, director or registered office provider) to or for the benefit of the listed record.";
  }
  if (m.includes("director disqualification")) {
    return "Director disqualification sanction: the listed record is disqualified from acting as a director of a UK company, and from being involved in the promotion, formation or management of one.";
  }
  if (m.includes("travel ban") || m.includes("immigration")) {
    return "Travel ban: the listed record is excluded from entering or remaining in the designating jurisdiction.";
  }
  if (m.includes("transport")) {
    return "Transport sanction: restrictions apply to the movement, registration or port access of the listed ship or aircraft.";
  }
  if (m.includes("arms") || m.includes("embargo")) {
    return "Arms embargo: supply, transfer or brokering of arms and related material involving the listed record is prohibited.";
  }
  if (m.includes("financial")) {
    return "Financial sanctions restrictions apply to dealings with the listed record.";
  }
  if (m.includes("trade")) {
    return "Trade restrictions apply to goods, technology or services involving the listed record.";
  }
  return null;
}
