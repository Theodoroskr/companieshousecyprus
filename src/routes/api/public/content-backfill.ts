import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled, bounded backfill of company page freshness timestamps.
 *
 * GET  — job progress (paused flag, last run, last error).
 * POST — runs one batch; requires the private scheduler secret for this job.
 */
export const Route = createFileRoute("/api/public/content-backfill")({
  server: {
    handlers: {
      GET: async () => {
        const { getContentBackfillState } = await import("@/lib/content-backfill.server");
        const state = await getContentBackfillState();
        return Response.json(state, { headers: { "cache-control": "no-store" } });
      },
      POST: async ({ request }) => {
        const { authorizeScheduler } = await import("@/lib/job-secret.server");
        const unauthorized = await authorizeScheduler(request, "content_backfill");
        if (unauthorized) return unauthorized;

        const url = new URL(request.url);
        const batch = Number(url.searchParams.get("batch"));
        const { runContentBackfill } = await import("@/lib/content-backfill.server");
        const result = await runContentBackfill(Number.isFinite(batch) && batch > 0 ? batch : undefined);

        return Response.json(result, {
          status: result.status === "failed" ? 500 : 200,
          headers: { "cache-control": "no-store" },
        });
      },
    },
  },
});
