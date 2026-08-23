/** Format an ISO date (YYYY-MM-DD) as DD/MM/YYYY. */
export function formatDate(value?: string | null): string | null {
  if (!value) return null;
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
