import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler-only endpoint: refreshes the EU Consolidated Financial Sanctions
 * List. Callers must present either the platform cron secret (Authorization:
 * Bearer …) or the project key in the `apikey` header, matching the pattern
 * used by the other scheduled jobs.
 */
function schedulerKeyMatches(request: Request): boolean {
  const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!expected) return false;
  const provided = request.headers.get("apikey") ?? "";
  return provided.length === expected.length && provided === expected;
}

async function run(request: Request) {
  if (!schedulerKeyMatches(request)) {
    const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
    const unauthorized = await authenticateCronRequest(request);
    if (unauthorized) return unauthorized;
  }

  const { runSanctionsImport } = await import("@/lib/sanctions.server");
  try {
    const result = await runSanctionsImport();
    return Response.json(result, {
      status: result.status === "failed" ? 500 : 200,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    console.error("[sanctions] import failed", error);
    return Response.json(
      { status: "failed", message: error instanceof Error ? error.message : "import failed" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/sanctions-import")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
    },
  },
});
