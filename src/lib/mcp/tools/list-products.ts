import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CATEGORY_LABEL, PRODUCTS } from "@/lib/products";

const BASE_URL = "https://companieshousecyprus.com";

export default defineTool({
  name: "list_products",
  title: "List orderable reports and certificates",
  description:
    "List the Cyprus company reports, certificates and packs that can be ordered on Companies House Cyprus, with prices in EUR, delivery times and order URLs.",
  inputSchema: {
    category: z
      .enum(["certificate", "report", "pack"])
      .optional()
      .describe("Optional filter: certificate, report or pack."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category }) => {
    const items = PRODUCTS.filter((p) => !category || p.category === category).map((p) => ({
      name: p.name,
      slug: p.slug,
      category: p.category,
      category_label: CATEGORY_LABEL[p.category],
      price_eur: p.price,
      delivery: p.delivery,
      typical_use: p.typicalUse,
      order_url: `${BASE_URL}/report/${p.slug}`,
    }));

    const payload = {
      currency: "EUR",
      pricing_note:
        "Registrar certificates carry a handling/service fee at checkout. VAT (19%) applies to reports and service fees, not to certificate charges.",
      products: items,
    };

    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
