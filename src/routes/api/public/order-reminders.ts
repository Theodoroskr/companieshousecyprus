import { createFileRoute } from "@tanstack/react-router";

async function run(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  const token = /^Bearer ([^\s,]+)$/.exec(auth)?.[1] ?? null;
  const { verifyReminderSecret, sendPendingOrderReminders } = await import(
    "@/lib/order-reminders.server"
  );
  if (!(await verifyReminderSecret(token))) {
    const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
    const cronFailure = await authenticateCronRequest(request);
    if (cronFailure) return new Response("Unauthorized", { status: 401 });
  }
  const result = await sendPendingOrderReminders();
  return Response.json(result);
}

export const Route = createFileRoute("/api/public/order-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});
