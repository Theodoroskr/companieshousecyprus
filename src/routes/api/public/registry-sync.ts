/**
 * Automated registry refresh worker. Invoked every 5 minutes by pg_cron with
 * the job_state secret. When idle it performs at most a weekly header check
 * against the open-data portal; while an import is active it processes the
 * next resumable slice.
 */

import { createFileRoute } from "@tanstack/react-router";
import { runRegistrySyncTick, verifyRegistrySyncSecret } from "@/lib/registry-sync.server";

export const Route = createFileRoute("/api/public/registry-sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = request.headers.get("x-job-secret") ?? url.searchParams.get("secret");
        if (!(await verifyRegistrySyncSecret(token))) {
          return new Response("Invalid secret", { status: 401 });
        }
        try {
          const force = url.searchParams.get("force") === "1";
          const result = await runRegistrySyncTick({ force });
          return new Response(JSON.stringify(result), {
            status: result.ok ? 200 : 500,
            headers: { "content-type": "application/json" },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
