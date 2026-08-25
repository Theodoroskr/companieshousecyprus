import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduler-only endpoint: runs the automated sitemap health check, records the
 * result and emails an alert when any sitemap URL stops returning a valid
 * 200 XML response. Requires the job secret or the platform cron secret.
 */
async function run(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = /^Bearer ([^\s,]+)$/.exec(auth)?.[1] ?? null;

  const { verifySitemapMonitorSecret, runSitemapHealthCheck } = await import(
    "@/lib/sitemap-monitor.server"
  );

  if (!(await verifySitemapMonitorSecret(token))) {
    const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
    const cronFailure = await authenticateCronRequest(request);
    if (cronFailure) return new Response("Unauthorized", { status: 401 });
  }

  const origin = new URL(request.url).origin;
  try {
    const result = await runSitemapHealthCheck(origin);
    return Response.json(result, { status: result.healthy ? 200 : 503 });
  } catch (err) {
    console.error("Sitemap monitor failed", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "monitor failed" },
      { status: 500 },
    );
  }
}

export const Route = createFileRoute("/api/public/sitemap-monitor")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});
