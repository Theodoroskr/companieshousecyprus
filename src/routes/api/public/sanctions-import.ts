import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler-only endpoint: refreshes every active sanctions source
 * (EU FSF, UN Consolidated List, …). Callers must present the platform cron
 * secret (Authorization: Bearer …).
 */
async function run(request: Request) {
  const { authorizeScheduler } = await import("@/lib/job-secret.server");
  const unauthorized = await authorizeScheduler(request, "sanctions_import");
  if (unauthorized) return unauthorized;

  const { listActiveSourceCodes, runSanctionsImport } = await import("@/lib/sanctions.server");
  try {
    // OFAC is handled by its own scheduled streaming worker (126 MB feed).
    const sources = (await listActiveSourceCodes()).filter((c) => c !== "OFAC_SDN");
    const results: Record<string, unknown> = {};
    let anyFailed = false;
    for (const sourceCode of sources) {
      const result = await runSanctionsImport({ sourceCode });
      results[sourceCode] = result;
      if (result.status === "failed") anyFailed = true;
    }
    return Response.json(results, {
      status: anyFailed ? 500 : 200,
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
