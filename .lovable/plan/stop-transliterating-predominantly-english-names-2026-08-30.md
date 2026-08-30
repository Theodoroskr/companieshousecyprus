# Stop transliterating predominantly-English names

## Problem
Registry names that are essentially English but contain a stray Greek look-alike
letter — e.g. `TCKΗ HOLDING LTD` (a Greek Η inside a Latin name) — are currently
run through the Greek-to-Latin transliterator. The page then renders a generated
Latin form next to the original, producing confusing duplicates like
`TCKI HOLDING LTDTCKΗ HOLDING LTD` in the directors list and summaries.

English names should be used exactly as registered, with no transliteration and
no duplicated "original" line.

## Approach

### 1. English-name detection in `src/lib/format.ts`
Add a helper `isPredominantlyLatin(text)`:
- Count letters in the Latin vs Greek ranges.
- If the text contains any Latin letters and Greek letters are a small minority
  (rule: Greek letter count ≤ 2 **or** Greek letters < 25% of all letters),
  the name is treated as English.

### 2. Short-circuit `greekToLatin`
- When `isPredominantlyLatin` is true, return the input unchanged.
- Effect cascades automatically:
  - `officialNameDisplay` → English names render as-is, `original` is null, so
    no duplicated grey text on the company page (line ~766) and no doubled
    strings in summaries/FAQ (line ~229).
  - `latinAddress` / `resolveAddressDisplay` → mostly-Latin addresses keep their
    registered form instead of a synthetic transliteration.
  - Pure-Greek names keep the current ELOT-743 / ISO 843 transliteration exactly
    as today.

### 3. Search still matches
- In `searchVariants`, for predominantly-Latin mixed names additionally push a
  look-alike-normalised variant (Greek homoglyphs → Latin: Η→H, Τ→T, Κ→K, Α→A,
  Ο→O, Ρ→P, Ν→N, Μ→M, Ι→I, Β→B, Ε→E, Ζ→Z, Χ→X, Υ→Y) so typing
  `TCKH HOLDING` or `TCKΗ HOLDING` both match the registered row. Display text is
  unaffected.

### 4. Tests — `src/lib/__tests__/official-name.test.ts`
Add cases:
- `TCKΗ HOLDING LTD` → returned unchanged, `original` is null (no duplicate).
- `JOHN ΠΑΠΑΣ TRADING LTD`-style mixed names → unchanged.
- Pure Greek names (e.g. `ΑΝΔΡΕΑΣ ΓΕΩΡΓΙΟΥ`) → still transliterated per ELOT-743.
- `searchVariants("TCKH HOLDING")` includes the homoglyph-normalised variant.
- Greek addresses still get a Latin line; Latin addresses do not.

## Verification
- Run the vitest suites.
- Open the affected company page in the preview and confirm the name shows once,
  exactly as registered, with no transliterated duplicate.
