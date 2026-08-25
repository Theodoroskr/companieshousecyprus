// The IndexNow key is public by design: crawlers verify ownership by fetching
// https://<host>/<key>.txt and comparing the contents to the submitted key.
export const INDEXNOW_KEY = "45ed6caade749016dd2c814621bad76e";
export const INDEXNOW_HOST = "companieshousecyprus.com";
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY_LOCATION = `${INDEXNOW_ORIGIN}/${INDEXNOW_KEY}.txt`;
// IndexNow accepts up to 10,000 URLs per request, but Bing can still throttle
// frequent updates. Keep batches deliberately small and space scheduler runs.
export const INDEXNOW_BATCH_SIZE = 100;
