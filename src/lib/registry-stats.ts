/**
 * Presentation helpers for the central registry statistics returned by
 * `getRegistryStats` (src/lib/companies.functions.ts).
 *
 * Kept browser-safe (no server imports) so the same formatting is reused by
 * every surface that displays the entity count or last-refresh date.
 */

export type RegistryStats = {
  count: number | null;
  lastRefresh: string | null;
};

/** "571,218" — or a neutral label when the count is unavailable. */
export function formatEntityCount(count: number | null | undefined): string {
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) {
    return "Searchable Cyprus entities";
  }
  return count.toLocaleString("en-GB");
}

/** True when we have a real number to show (vs. the fallback label). */
export function hasEntityCount(count: number | null | undefined): boolean {
  return typeof count === "number" && Number.isFinite(count) && count > 0;
}

/** "25/08/2026" — empty string when the date is missing or unparseable. */
export function formatRefreshDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}
