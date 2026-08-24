import { createFileRoute } from "@tanstack/react-router";

/**
 * API4ALL push callback. Configure the URL with API4ALL as:
 *   https://<site>/api/public/a4a-callback?token=<callback token>
 * The token is shown on the Admin → API4ALL page.
 *
 * Accepted body shapes (any of):
 *   { reference, report }            — reference we sent with the order
 *   { code, kind, report }           — company code + "structure" | "credit"
 *   raw report JSON, with ?reference=/?code=/?kind= in the query string
 */
export const Route = createFileRoute("/api/public/a4a-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const bearer = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
        const token = bearer ?? url.searchParams.get("token");
        const { verifyJobSecret, applyCallbackReport } = await import("@/lib/a4a-jobs.server");
        if (!(await verifyJobSecret(token))) return new Response("Unauthorized", { status: 401 });

        let payload: Record<string, unknown> = {};
        try {
          const parsed = JSON.parse(await request.text());
          payload = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const pick = (key: string) => {
          const value = payload[key];
          return typeof value === "string" ? value : url.searchParams.get(key);
        };

        const report = payload["report"] ?? payload["data"] ?? payload;
        const result = await applyCallbackReport({
          reference: pick("reference"),
          code: pick("code"),
          kind: pick("kind"),
          report,
        });
        return Response.json(result, { status: result.ok ? 200 : 404 });
      },
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});
