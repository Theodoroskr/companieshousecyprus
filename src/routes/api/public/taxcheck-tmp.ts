import { createFileRoute } from "@tanstack/react-router";
import { verifyProductTaxCodes } from "@/lib/products-verify.functions";

export const Route = createFileRoute("/api/public/taxcheck-tmp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const environment = url.searchParams.get("env") === "live" ? "live" : "sandbox";
        const result = await verifyProductTaxCodes({ data: { environment } });
        return Response.json(result);
      },
    },
  },
});
