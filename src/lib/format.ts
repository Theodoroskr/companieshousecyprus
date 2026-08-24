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
 * Transliterate a Greek string into Latin characters (ELOT-743 style, simplified),
 * preserving the original casing pattern of each word.
 */
export function greekToLatin(input?: string | null): string | null {
  if (!input) return null;
  const clean = stripAccents(input).replace(/ς/g, "σ");
  if (!/[\u0370-\u03ff]/.test(clean)) return input;

  let out = "";
  let i = 0;
  while (i < clean.length) {
    const char = clean[i]!;
    const upperPair = (char + (clean[i + 1] ?? "")).toUpperCase();
    const digraph = DIGRAPHS[upperPair];
    const isGreek = /[\u0370-\u03ff]/.test(char);

    if (digraph && /[\u0370-\u03ff]/.test(clean[i + 1] ?? "")) {
      const bothUpper = char === char.toUpperCase() && clean[i + 1] === clean[i + 1]!.toUpperCase();
      out += bothUpper ? digraph.toUpperCase() : char === char.toUpperCase() ? digraph : digraph.toLowerCase();
      i += 2;
      continue;
    }

    if (isGreek) {
      const mapped = LETTERS[char.toUpperCase()] ?? char;
      out += char === char.toUpperCase() ? mapped.toUpperCase() === mapped ? mapped : mapped : mapped.toLowerCase();
      i += 1;
      continue;
    }

    out += char;
    i += 1;
  }
  return out;
}

/** Build the Latin-script version of a Greek registered-office address. */
export function latinAddress(address?: string | null): string | null {
  const latin = greekToLatin(address);
  if (!latin) return null;
  return latin.replace(/Kypros/i, "Cyprus");
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
