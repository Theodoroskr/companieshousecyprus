/**
 * Types and presentation helpers for the company-name statistics dashboard
 * (/statistics/company-names). The heavy aggregation runs in the database
 * (`public.company_name_stats()`); this module shapes the JSON payload into
 * chart-ready series. Browser-safe: no server imports.
 */

export type CompanyNameStats = {
  total: number;
  top_words: Array<{ word: string; count: number }>;
  scripts: { greek: number; latin: number; mixed: number; other: number };
  letters: Array<{ letter: string; count: number }>;
  lengths: Array<{ bucket: string; count: number }>;
  computed_at: string;
};

/**
 * Industry signals: families of words that indicate a line of business.
 * Counts are derived from the top-words list returned by the database, so a
 * category only appears when at least one of its words made the top 200.
 */
export const INDUSTRY_SIGNALS: Array<{
  label: string;
  words: string[];
}> = [
  { label: "Trading & commerce", words: ["trading", "trade", "imports", "commercial", "general", "wholesale", "retail"] },
  { label: "Investments & finance", words: ["investments", "investment", "invest", "capital", "finance", "financial", "ventures", "partners"] },
  { label: "Services & consulting", words: ["services", "service", "consulting", "consultants", "consultancy", "management", "solutions"] },
  { label: "Shipping & maritime", words: ["shipping", "marine", "maritime", "navigation", "sea"] },
  { label: "Property & construction", words: ["properties", "property", "estates", "estate", "real", "development", "developments", "developers", "construction", "constructions", "land", "εργοληπτικη"] },
  { label: "Hospitality & food", words: ["restaurant", "bar", "hotel", "cafe", "coffee", "catering", "food", "travel", "tours"] },
  { label: "Technology & digital", words: ["technologies", "technology", "tech", "digital", "software", "systems"] },
  { label: "Media & marketing", words: ["media", "marketing", "advertising", "entertainment", "productions"] },
  { label: "Health & beauty", words: ["medical", "beauty", "hair", "φροντιστηριο"] },
  { label: "Engineering & industry", words: ["engineering", "industries", "electrical", "energy"] },
  { label: "Retail & lifestyle", words: ["shop", "boutique", "fashion", "sports", "art", "design", "studio"] },
  { label: "Motoring & transport", words: ["car", "motors", "transport"] },
  { label: "Insurance & security", words: ["insurance", "security"] },
];

export type IndustrySignal = { label: string; count: number };

/** Sum each industry's word counts from the top-words payload. */
export function industrySignals(stats: CompanyNameStats): IndustrySignal[] {
  const byWord = new Map(stats.top_words.map((w) => [w.word, w.count]));
  return INDUSTRY_SIGNALS.map((s) => ({
    label: s.label,
    count: s.words.reduce((sum, w) => sum + (byWord.get(w) ?? 0), 0),
  }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

/** Merge Greek homoglyph letters (e.g. "Α") into their Latin equivalents for the A–Z chart. */
const GREEK_TO_LATIN_LETTER: Record<string, string> = {
  Α: "A", Β: "V", Ε: "E", Ζ: "Z", Η: "I", Ι: "I", Κ: "K", Μ: "M", Ν: "N",
  Ο: "O", Ρ: "R", Τ: "T", Υ: "Y", Χ: "H",
};

export type LetterCount = { letter: string; count: number };

export function letterDistribution(stats: CompanyNameStats): LetterCount[] {
  const merged = new Map<string, number>();
  for (const { letter, count } of stats.letters) {
    const key = GREEK_TO_LATIN_LETTER[letter] ?? letter;
    merged.set(key, (merged.get(key) ?? 0) + count);
  }
  return [...merged.entries()]
    .map(([letter, count]) => ({ letter, count }))
    .sort((a, b) => a.letter.localeCompare(b.letter));
}

/** "25/08/2026" — used for the "computed" stamp. */
export function formatComputedAt(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}
