/**
 * Cross-source name normalization for sanctions screening.
 *
 * Original values are never modified — every form derived here is stored
 * alongside the original so screening remains fully explainable.
 */

export type NameForms = {
  original: string;
  /** Unicode NFKC-normalized */
  unicode: string;
  /** Uppercase search form */
  upper: string;
  /** Diacritic-insensitive, uppercase */
  diacriticInsensitive: string;
  /** Punctuation replaced by spaces */
  punctuationNormalized: string;
  /** Collapsed whitespace */
  whitespaceNormalized: string;
  /** Upper + diacritic-insensitive + punctuation + whitespace (primary search key) */
  searchKey: string;
  /** searchKey with recognised legal suffixes removed (company comparison) */
  comparisonKey: string;
  /** Transliterated to Latin where applicable (Greek, Cyrillic, Arabic) */
  transliteration: string;
  /** Token list of the search key */
  tokens: string[];
};

const GREEK_MAP: Record<string, string> = {
  Α: "A", Β: "V", Γ: "G", Δ: "D", Ε: "E", Ζ: "Z", Η: "I", Θ: "TH", Ι: "I", Κ: "K",
  Λ: "L", Μ: "M", Ν: "N", Ξ: "X", Ο: "O", Π: "P", Ρ: "R", Σ: "S", Τ: "T", Υ: "Y",
  Φ: "F", Χ: "CH", Ψ: "PS", Ω: "O",
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k",
  λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t",
  υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

const CYRILLIC_MAP: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ё: "E", Ж: "ZH", З: "Z", И: "I",
  Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P", Р: "R", С: "S", Т: "T",
  У: "U", Ф: "F", Х: "KH", Ц: "TS", Ч: "CH", Ш: "SH", Щ: "SHCH", Ъ: "", Ы: "Y",
  Ь: "", Э: "E", Ю: "YU", Я: "YA", І: "I", Ї: "YI", Є: "YE", Ґ: "G",
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y",
  ь: "", э: "e", ю: "yu", я: "ya", і: "i", ї: "yi", є: "ye", ґ: "g",
};

/** Basic Arabic → Latin (simplified, for candidate generation only). */
const ARABIC_MAP: Record<string, string> = {
  ا: "a", أ: "a", إ: "i", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h", خ: "kh",
  د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d", ط: "t", ظ: "z",
  ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m", ن: "n", ه: "h", ة: "h",
  و: "w", ي: "y", ى: "a", ء: "", ئ: "y", ؤ: "w",
};

export function transliterate(value: string): string {
  let out = "";
  for (const ch of value) {
    out += GREEK_MAP[ch] ?? CYRILLIC_MAP[ch] ?? ARABIC_MAP[ch] ?? ch;
  }
  return out;
}

/** Recognised legal suffixes stripped only from the comparison key. */
export const LEGAL_SUFFIXES = new Set([
  "LIMITED", "LTD", "PLC", "LLC", "LLP", "INC", "INCORPORATED", "CORPORATION", "CORP",
  "COMPANY", "CO", "SA", "AG", "GMBH", "BV", "NV", "SARL", "HOLDINGS", "HOLDING",
  "PUBLIC", "PRIVATE", "AND", // "&" becomes AND after punctuation normalization
]);

export function normalizeNameForms(raw: string): NameForms {
  const original = raw ?? "";
  const unicode = original.normalize("NFKC");
  const upper = unicode.toUpperCase();
  const diacriticInsensitive = upper.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const translit = transliterate(diacriticInsensitive);
  const punctuationNormalized = translit
    .replace(/&/g, " AND ")
    .replace(/['''`]/g, "")
    .replace(/[-–—.,/\\()®™:;"+*#_]+/g, " ");
  const whitespaceNormalized = punctuationNormalized.replace(/\s+/g, " ").trim();
  const searchKey = whitespaceNormalized;
  const tokens = searchKey.split(" ").filter(Boolean);
  const comparisonTokens = [...tokens];
  while (comparisonTokens.length > 1 && LEGAL_SUFFIXES.has(comparisonTokens[comparisonTokens.length - 1]!)) {
    comparisonTokens.pop();
  }
  return {
    original,
    unicode,
    upper,
    diacriticInsensitive,
    punctuationNormalized,
    whitespaceNormalized,
    searchKey,
    comparisonKey: comparisonTokens.join(" "),
    transliteration: translit,
    tokens,
  };
}

/**
 * Person-name variants for candidate generation:
 * original order, reversed first/last order, and an initials-collapsed form.
 */
export function personNameVariants(raw: string): string[] {
  const forms = normalizeNameForms(raw);
  const variants = new Set<string>([forms.searchKey, forms.comparisonKey].filter(Boolean));
  const tokens = forms.tokens;
  if (tokens.length >= 2) {
    variants.add([...tokens.slice(1), tokens[0]!].join(" ")); // reversed
    variants.add([tokens[tokens.length - 1]!, ...tokens.slice(0, -1)].join(" "));
  }
  return [...variants].filter((v) => v.length >= 2);
}

/** Company-name variants: full normalized name plus suffix-stripped comparison key. */
export function companyNameVariants(raw: string): string[] {
  const forms = normalizeNameForms(raw);
  return [...new Set([forms.searchKey, forms.comparisonKey].filter((v) => v && v.length >= 2))];
}

/** Token-set Jaccard similarity in [0,1] — transparent name explanation. */
export function tokenJaccard(a: string, b: string): number {
  const ta = new Set(normalizeNameForms(a).tokens);
  const tb = new Set(normalizeNameForms(b).tokens);
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}
