/**
 * Scheduled company-monitoring sweep. Invoked daily by pg_cron with the
 * job_state secret; compares watched companies against the registry, records
 * alerts and emails customers.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  runMonitoringCheck,
  sendTestMonitoringAlert,
  verifyMonitoringSecret,
} from "@/lib/monitoring.server";

export const Route = createFileRoute("/api/public/monitor-check")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token =
          request.headers.get("x-job-secret") ?? url.searchParams.get("secret");
        if (!(await verifyMonitoringSecret(token))) {
          return new Response("Invalid secret", { status: 401 });
        }
        const testTo = url.searchParams.get("test");
        if (testTo) {
          const test = await sendTestMonitoringAlert(testTo);
          return new Response(JSON.stringify(test), {
            status: test.ok ? 200 : 500,
            headers: { "content-type": "application/json" },
          });
        }
        const result = await runMonitoringCheck();
        return new Response(JSON.stringify(result), {
          status: result.ok ? 200 : 500,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
