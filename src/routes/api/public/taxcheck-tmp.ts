import { createFileRoute } from "@tanstack/react-router";
import { verifyProductTaxCodes } from "@/lib/products-verify.functions";

export const Route = createFileRoute("/api/public/taxcheck-tmp")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const environment = url.searchParams.get("env") === "live" ? "live" : "sandbox";
        const { createStripeClient } = await import("@/lib/stripe.server");
        if (url.searchParams.get("list")) {
          const stripe = createStripeClient(environment);
          const prods = await stripe.products.list({ limit: 100 });
          return Response.json(prods.data.map((p) => ({ id: p.id, name: p.name, tax_code: p.tax_code })));
        }
        const result = await verifyProductTaxCodes({ data: { environment } });
        return Response.json(result);
      },
    },
  },
});
