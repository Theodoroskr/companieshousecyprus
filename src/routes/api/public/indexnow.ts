import { createFileRoute } from "@tanstack/react-router";
import { getIndexNowStatus, runIndexNowBatch } from "@/lib/indexnow.server";

/**
 * IndexNow batch submitter. Called by the scheduled job (pg_cron) with the
 * project's publishable key in the `apikey` header. GET returns a read-only
 * status report with no customer data.
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

export const Route = createFileRoute("/api/public/indexnow")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json(await getIndexNowStatus(), {
          headers: { "cache-control": "no-store" },
        });
      },
      POST: async ({ request }) => {
        if (!authorized(request)) {
          return new Response("Unauthorized", { status: 401 });
        }
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
