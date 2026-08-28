import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler-only endpoint: dedicated worker for the OFAC SDN Advanced XML
 * (~126 MB). Uses the streaming import path so peak memory stays within the
 * standard function limits. Callers must present the platform cron secret.
 */
async function run(request: Request) {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const unauthorized = await authenticateCronRequest(request);
  if (unauthorized) return unauthorized;

  const { runOfacStreamingImport } = await import("@/lib/sanctions.server");
  try {
    const result = await runOfacStreamingImport();
    return Response.json(result, {
      status: result.status === "failed" ? 500 : 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("[ofac-worker] import failed", error);
    return Response.json(
      { status: "failed", message: error instanceof Error ? error.message : "import failed" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/ofac-worker")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
    },
  },
});
