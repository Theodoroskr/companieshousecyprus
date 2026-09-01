import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler-only endpoint: dedicated worker for the OFAC SDN Advanced XML
 * (~126 MB). Uses the streaming import path so peak memory stays within the
 * standard function limits. Callers must present the platform cron secret.
 */
async function run(request: Request) {
  const { authorizeScheduler } = await import("@/lib/job-secret.server");
  const unauthorized = await authorizeScheduler(request, "ofac_worker");
  if (unauthorized) return unauthorized;

  const { runOfacStreamingImport } = await import("@/lib/sanctions.server");
  const force =
    new URL(request.url).searchParams.get("force") === "1" ||
    (await request
      .clone()
      .json()
      .then((b: unknown) => Boolean((b as { force?: boolean } | null)?.force))
      .catch(() => false));

  // The 126 MB parse takes far longer than the platform's HTTP request budget
  // (the gateway cuts the connection at ~45s with a 502). Kick the import off
  // and answer immediately so the caller's disconnect never interrupts it; the
  // import row's heartbeat reports progress and the database watchdog closes
  // the run if it really does die.
  void runOfacStreamingImport({ force }).catch((error) => {
    console.error("[ofac-worker] import failed", error);
  });



  return Response.json(
    { status: "started", message: "OFAC import started in the background." },
    { status: 202, headers: { "cache-control": "no-store" } },
  );
}


export const Route = createFileRoute("/api/public/ofac-worker")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
    },
  },
});
