import { createFileRoute } from "@tanstack/react-router";
import { listChangeFeedRuns, listChangedCompanies, runDailyChangeFeed } from "@/lib/change-feed.server";
import { CHANGE_FEED_MAX_ITEMS } from "@/lib/change-feed";

/**
 * Daily feed of updated company IDs.
 *
 * GET  — public, read-only list of company IDs changed in the window plus the
 *        last few job runs. Only registry data (public by design) is exposed.
 * POST — scheduled trigger (pg_cron, publishable key in the `apikey` header):
 *        regenerates sitemap chunk metadata and submits ONLY the changed
 *        profiles to IndexNow.
 */
function authorized(request: Request): boolean {
  const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!expected) return false;
  const provided =
    request.headers.get("apikey") ??
    /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1] ??
    "";
  return provided.length === expected.length && provided === expected;
}

export const Route = createFileRoute("/api/public/change-feed")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const since = url.searchParams.get("since");
        const limitParam = Number(url.searchParams.get("limit"));
        try {
          const [feed, runs] = await Promise.all([
            listChangedCompanies({
              since: since && !Number.isNaN(new Date(since).getTime()) ? new Date(since).toISOString() : null,
              limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : CHANGE_FEED_MAX_ITEMS,
            }),
            listChangeFeedRuns(5),
          ]);
          return Response.json(
            {
              generatedAt: new Date().toISOString(),
              windowStart: feed.windowStart,
              windowEnd: feed.windowEnd,
              count: feed.items.length,
              truncated: feed.truncated,
              ids: feed.items.map((item) => item.id),
              companies: feed.items,
              runs,
            },
            { headers: { "cache-control": "public, max-age=300" } },
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : "change feed unavailable";
          return Response.json({ error: message }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        try {
          const result = await runDailyChangeFeed();
          return Response.json(result, {
            status: result.status === "completed" ? 200 : 502,
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "daily change feed failed";
          console.error("[change-feed] run failed", error);
          return Response.json({ status: "failed", message }, { status: 500 });
        }
      },
    },
  },
});
