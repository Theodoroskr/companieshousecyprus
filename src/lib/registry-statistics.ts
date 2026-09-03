/**
 * Registrar of Companies (Cyprus) registration statistics, January–July 2026.
 *
 * Shared by the /resources editorial page and the /statistics dashboard so
 * both surfaces always show identical figures.
 */

export type StatisticRow = {
  month: string;
  companies: number;
  partnerships: number;
  businessNames: number;
  overseas: number;
  seEeig: number;
};

export const REGISTRY_STATISTICS: StatisticRow[] = [
  { month: "01/26", companies: 910, partnerships: 8, businessNames: 111, overseas: 27, seEeig: 1 },
  { month: "02/26", companies: 1420, partnerships: 9, businessNames: 157, overseas: 3, seEeig: 0 },
  { month: "03/26", companies: 1745, partnerships: 7, businessNames: 144, overseas: 7, seEeig: 0 },
  { month: "04/26", companies: 1448, partnerships: 9, businessNames: 134, overseas: 8, seEeig: 1 },
  { month: "05/26", companies: 1489, partnerships: 4, businessNames: 130, overseas: 8, seEeig: 1 },
  { month: "06/26", companies: 1527, partnerships: 6, businessNames: 180, overseas: 7, seEeig: 0 },
  { month: "07/26", companies: 1540, partnerships: 8, businessNames: 192, overseas: 2, seEeig: 0 },
];

export const STATISTICS_PERIOD = "January – July 2026";
export const STATISTICS_PUBLISHED_LABEL = "10 August 2026";
/** ISO timestamp used for the “last updated” stamp and schema.org markup. */
export const STATISTICS_LAST_UPDATED = "2026-08-10T08:00:00+03:00";

export type StatisticSeriesKey = keyof Omit<StatisticRow, "month">;

export const STATISTIC_SERIES: Array<{
  key: StatisticSeriesKey;
  label: string;
  greek: string;
  color: string;
}> = [
  { key: "companies", label: "Companies", greek: "Εγγραφή Εταιρειών", color: "var(--chart-1)" },
  { key: "partnerships", label: "Partnerships", greek: "Εγγραφή Συνεταιρισμών", color: "var(--chart-2)" },
  { key: "businessNames", label: "Business Names", greek: "Εγγραφή Εμπορικών Επωνυμιών", color: "var(--chart-3)" },
  { key: "overseas", label: "Overseas Companies", greek: "Εγγραφή Αλλοδαπών Εταιρειών", color: "var(--chart-4)" },
  { key: "seEeig", label: "SE & EEIG", greek: "Εγγραφή Ευρωπαϊκών Εταιρειών και ΕΟΟΣ", color: "var(--chart-5)" },
];

export function statisticTotal(key: StatisticSeriesKey): number {
  return REGISTRY_STATISTICS.reduce((sum, row) => sum + row[key], 0);
}

export function statisticsGrandTotal(): number {
  return STATISTIC_SERIES.reduce((sum, s) => sum + statisticTotal(s.key), 0);
}

/** Month-over-month % change for a series between the two latest months. */
export function latestTrend(key: StatisticSeriesKey): number | null {
  const rows = REGISTRY_STATISTICS;
  if (rows.length < 2) return null;
  const prev = rows[rows.length - 2][key];
  const curr = rows[rows.length - 1][key];
  if (prev <= 0) return null;
  return ((curr - prev) / prev) * 100;
}
