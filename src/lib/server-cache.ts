/**
 * Tiny per-isolate TTL cache with stale-while-revalidate.
 *
 * Public listing pages (directory, A–Z) render the same data for every
 * visitor, but each SSR pass used to re-query the backend. When the backend
 * has a latency blip, that blip lands directly on the page's TTFB. Caching
 * the resolved value in worker memory means at most one backend round-trip
 * per key per TTL window, and a stale value is served instantly while a
 * refresh runs in the background.
 */

type Entry<T> = { value: T; expires: number; staleUntil: number; refreshing?: boolean };

const store = new Map<string, Entry<unknown>>();
const MAX_ENTRIES = 500;

export function clearServerCache(): void {
  store.clear();
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  staleMs = ttlMs * 10,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as Entry<T> | undefined;

  if (entry && now < entry.expires) return entry.value;

  if (entry && now < entry.staleUntil) {
    if (!entry.refreshing) {
      entry.refreshing = true;
      void loader()
        .then((value) => {
          store.set(key, {
            value,
            expires: Date.now() + ttlMs,
            staleUntil: Date.now() + ttlMs + staleMs,
          });
        })
        .catch(() => {
          entry.refreshing = false;
        });
    }
    return entry.value;
  }

  const value = await loader();
  if (store.size >= MAX_ENTRIES) store.clear();
  store.set(key, { value, expires: now + ttlMs, staleUntil: now + ttlMs + staleMs });
  return value;
}
