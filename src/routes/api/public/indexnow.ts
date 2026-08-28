import { createFileRoute } from "@tanstack/react-router";
import { getIndexNowStatus, runIndexNowBatch } from "@/lib/indexnow.server";

/**
 * IndexNow batch submitter. Called by the scheduled job with the platform
 * cron secret in the Authorization header. GET returns a read-only status
 * report with no customer data.
 */

export const Route = createFileRoute("/api/public/indexnow")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(await getIndexNowStatus(), {
          headers: { "cache-control": "no-store" },
        });
      },
      POST: async ({ request }) => {
        const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;
        try {
          const result = await runIndexNowBatch();
          return Response.json(result, {
            status: result.ok || result.status === "locked" || result.status === "cooling_down" || result.status === "paused" ? 200 : 502,
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "IndexNow run failed";
          console.error("[indexnow] run failed", error);
          return Response.json({ ok: false, status: "error", message }, { status: 500 });
        }
      },
    },
  },
});
