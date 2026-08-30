/** Registry / report timestamps are authored in Cyprus local time. */
export const REGISTRY_TIME_ZONE = "Asia/Nicosia";

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: REGISTRY_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Format a date or timestamp as DD/MM/YYYY.
 *
 * Timestamps carrying an explicit zone (trailing `Z` or `±HH:MM`) are converted
 * to Cyprus time first, so the displayed day matches the actual registry date.
 * Date-only values and naive timestamps are already Cyprus-local and are read
 * literally, avoiding an off-by-one-day shift.
 */
export function formatDate(value?: string | null): string | null {
  if (!value) return null;

  const zoned = /\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?\s*(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
  if (zoned) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return dayFormatter.format(parsed);
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
}


const DIGRAPHS: Record<string, string> = {
  ΑΙ: "Ai", ΕΙ: "Ei", ΟΙ: "Oi", ΟΥ: "Ou", ΑΥ: "Av", ΕΥ: "Ev", ΗΥ: "Iv",
  ΜΠ: "B", ΝΤ: "Nt", ΓΓ: "Ng", ΓΚ: "Gk", ΤΣ: "Ts", ΤΖ: "Tz",
};

const LETTERS: Record<string, string> = {
  Α: "A", Β: "V", Γ: "G", Δ: "D", Ε: "E", Ζ: "Z", Η: "I", Θ: "Th", Ι: "I",
  Κ: "K", Λ: "L", Μ: "M", Ν: "N", Ξ: "X", Ο: "O", Π: "P", Ρ: "R", Σ: "S",
  Τ: "T", Υ: "Y", Φ: "F", Χ: "Ch", Ψ: "Ps", Ω: "O",
};

function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
}

/**
 * True when the text is essentially an English/Latin name that happens to
 * contain a stray Greek look-alike letter (registry data sometimes records an
 * English company name with one Greek homoglyph, e.g. "TCKΗ HOLDING LTD").
 * Such names must be used exactly as registered — transliterating them
 * produces a wrong synthetic Latin form.
 */
export function isPredominantlyLatin(text?: string | null): boolean {
  if (!text) return false;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  const greek = (text.match(/[\u0370-\u03ff]/g) ?? []).length;
  if (latin === 0 || greek === 0) return latin > 0;
  return greek <= 2 || greek / (latin + greek) < 0.25;
}

/**
 * Transliterate a Greek string into Latin characters (ELOT-743 style, simplified),
 * preserving the original casing pattern of each word.
 *
 * Predominantly-Latin text (English names with a stray Greek homoglyph) is
 * returned unchanged — it is already the registered English form.
 */
export function greekToLatin(input?: string | null): string | null {
  if (!input) return null;
  const clean = stripAccents(input).replace(/ς/g, "σ");
  if (!/[\u0370-\u03ff]/.test(clean)) return input;
  if (isPredominantlyLatin(clean)) return input;

  const isGreekChar = (ch: string | undefined) => !!ch && /[\u0370-\u03ff]/.test(ch);
  const isUpperGreek = (ch: string | undefined) => isGreekChar(ch) && ch === ch!.toUpperCase();
  /** True when the letter sits inside an ALL-CAPS run (registry data is upper-case). */
  const inCapsRun = (idx: number, span: number) =>
    isUpperGreek(clean[idx - 1]) || isUpperGreek(clean[idx + span]);

  let out = "";
  let i = 0;
  while (i < clean.length) {
    const char = clean[i]!;
    const upperPair = (char + (clean[i + 1] ?? "")).toUpperCase();
    const digraph = DIGRAPHS[upperPair];
    const isGreek = isGreekChar(char);

    if (digraph && isGreekChar(clean[i + 1])) {
      const bothUpper = isUpperGreek(char) && isUpperGreek(clean[i + 1]);
      out += !bothUpper
        ? isUpperGreek(char)
          ? digraph
          : digraph.toLowerCase()
        : inCapsRun(i, 2)
          ? digraph.toUpperCase()
          : digraph;
      i += 2;
      continue;
    }

    if (isGreek) {
      const mapped = LETTERS[char.toUpperCase()] ?? char;
      out += !isUpperGreek(char) ? mapped.toLowerCase() : inCapsRun(i, 1) ? mapped.toUpperCase() : mapped;
      i += 1;
      continue;
    }

    out += char;
    i += 1;
  }
  return out;
}

/**
 * Latin (ELOT-743 / ISO 843) rendering of a person's name, plus the Greek
 * original when it genuinely differs. Used for directors and secretaries so
 * the names are readable and searchable outside Greek script.
 */
export function officialNameDisplay(name?: string | null): { primary: string; original: string | null } | null {
  const raw = (name ?? "").replace(/\s+/g, " ").trim();
  if (!raw) return null;
  const latin = (greekToLatin(raw) ?? raw).trim();
  return { primary: latin, original: latin !== raw ? raw : null };
}


/** Tidy a raw registry address: collapse whitespace and empty comma segments. */
export function cleanAddress(address?: string | null): string | null {
  if (!address) return null;
  const parts = address
    .replace(/\s+/g, " ")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && /[\p{L}\p{N}]/u.test(p));
  // Drop consecutive duplicates (registry data often repeats locality/district).
  const deduped = parts.filter(
    (p, i) => i === 0 || p.toLocaleUpperCase() !== parts[i - 1]!.toLocaleUpperCase(),
  );
  const joined = deduped.join(", ").trim();
  return joined.length >= 3 ? joined : null;
}

/** Build the Latin-script version of a Greek registered-office address. */
export function latinAddress(address?: string | null): string | null {
  const latin = greekToLatin(cleanAddress(address));
  if (!latin) return null;
  return latin.replace(/Kypros/i, "Cyprus");
}

export type AddressDisplay = {
  /** Best available address form, always Latin script when transliteration is possible. */
  primary: string;
  primaryLabel: string;
  /** Original Greek line, only when it genuinely differs from the primary line. */
  secondary: string | null;
  secondaryLabel: string;
  source: "registry" | "components";
};

/**
 * Resolve the address to display, with a robust fallback chain:
 * full registry address -> cleaned components -> null. The Greek original is
 * only shown as a secondary line when it differs from the primary form, so a
 * non-Greek or already-Latin address never renders twice.
 */
export function resolveAddressDisplay(company: {
  address_full?: string | null;
  building?: string | null;
  street?: string | null;
  locality?: string | null;
  postcode?: string | null;
  district_el?: string | null;
  district_en?: string | null;
}): AddressDisplay | null {
  const full = cleanAddress(company.address_full);
  const composed = cleanAddress(
    [
      company.street,
      company.building,
      company.locality,
      company.postcode,
      company.district_en ?? company.district_el,
    ]
      .filter(Boolean)
      .join(", "),
  );

  const original = full ?? composed;
  if (!original) return null;

  const latin = latinAddress(original) ?? original;
  const differs = latin.toLocaleUpperCase() !== original.toLocaleUpperCase();

  return {
    primary: latin,
    primaryLabel: differs ? "English (transliterated)" : "Registered address",
    secondary: differs ? original : null,
    secondaryLabel: "Greek (official)",
    source: full ? "registry" : "components",
  };
}


export function companyAge(value?: string | null): { years: number; months: number; label: string } | null {
  if (!value) return null;
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const label =
    years === 0
      ? `${rem} month${rem === 1 ? "" : "s"}`
      : `${years} year${years === 1 ? "" : "s"}${rem ? ` ${rem} mo` : ""}`;
  return { years, months: rem, label };
}

/** Return the user-facing registration number, normalising partnership prefix to P. */
export function displayOfficialNo(company: {
  type_code?: string | null;
  type_en?: string | null;
  official_no?: string | null;
  reg_number?: number | null;
}): string {
  const no = company.official_no?.trim() ?? "";
  const digits = String(company.reg_number ?? "").replace(/\D/g, "");
  const isPartnership = company.type_code === "P" || company.type_en?.toLowerCase() === "partnership";
  if (isPartnership && digits) {
    return no.toUpperCase().startsWith("S") || no.toUpperCase().startsWith("P")
      ? `P${digits}`
      : no || `P${digits}`;
  }
  return no || digits || "—";
}

/** True for Business Name / Partnership (BN) registrations, which have owners rather than directors. */
export function isBusinessName(company: { type_code?: string | null }): boolean {
  return company.type_code === "B" || company.type_code === "N";
}

/** Mask a person or entity name, keeping initials and word shape: "Andreas Georgiou" -> "A•••••• G•••••••". */
export function maskName(name: string | null | undefined): string {
  if (!name) return "•••••• ••••••";
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const first = word.charAt(0);
      const rest = Math.max(word.length - 1, 3);
      return first + "•".repeat(Math.min(rest, 9));
    })
    .join(" ");
}

/**
 * Build the set of query variants to match against Latin-script registry names.
 * A Greek query is transliterated (ELOT-743 style) so "ΤΡΑΠΕΖΑ ΚΥΠΡΟΥ" also
 * matches "TRAPEZA KYPROU"; accents and final sigma are normalised too.
 */
export function searchVariants(q: string): string[] {
  const base = stripAccents(q).trim().replace(/\s+/g, " ");
  const out: string[] = [];
  const push = (value?: string | null) => {
    const v = (value ?? "").trim();
    if (v && !out.some((existing) => existing.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  push(base);
  push(greekToLatin(base));
  return out;
}
