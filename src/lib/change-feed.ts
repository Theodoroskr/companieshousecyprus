// Pure, client-safe constants and types for the daily "changed companies" feed.

/** Fallback window when no previous run is recorded. */
export const CHANGE_FEED_DEFAULT_WINDOW_HOURS = 24;
/** Hard cap on rows returned by the public feed / processed per run. */
export const CHANGE_FEED_MAX_ITEMS = 5000;
/** Safety overlap so records written mid-run are never skipped. */
export const CHANGE_FEED_OVERLAP_MINUTES = 10;

export type ChangedCompany = {
  /** Registry ID used as the canonical URL segment, e.g. "C409882". */
  id: string;
  slug: string;
  name: string;
  updatedAt: string;
  canonicalUrl: string;
};

export type ChangeFeedRunSummary = {
  id: string;
  windowStart: string;
  windowEnd: string;
  changedCount: number;
  enqueuedCount: number;
  chunksRefreshed: number | null;
  indexNowSubmitted: number;
  indexNowStatus: string | null;
  status: string;
  message: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export function changeFeedWindowStart(
  lastWindowEnd: string | null,
  now: Date = new Date(),
): string {
  if (lastWindowEnd) {
    const previous = new Date(lastWindowEnd).getTime();
    if (!Number.isNaN(previous)) {
      return new Date(previous - CHANGE_FEED_OVERLAP_MINUTES * 60_000).toISOString();
    }
  }
  return new Date(now.getTime() - CHANGE_FEED_DEFAULT_WINDOW_HOURS * 3_600_000).toISOString();
}
