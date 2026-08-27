import { createServerFn } from "@tanstack/react-start";
import { PRODUCTS } from "@/lib/products";
import { createStripeClient, type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";

export type TaxCodeCheckRow = {
  id: string;
  expected: string;
  actual: string | null;
  ok: boolean;
  error?: string;
};

const AUXILIARY_IDS = ["apostille-service", "certificate-service-fee"];
const DEFAULT_TAX_CODE = "txcd_10103001";

export const verifyProductTaxCodes = createServerFn({ method: "POST" })
  .inputValidator((data: { environment: StripeEnv }) => {
    if (data?.environment !== "sandbox" && data?.environment !== "live") {
      throw new Error("Invalid environment");
    }
    return data;
  })
  .handler(async ({ data }): Promise<{ rows: TaxCodeCheckRow[]; allOk: boolean }> => {
    const stripe = createStripeClient(data.environment);
    const targets = [
      ...PRODUCTS.map((p) => ({ id: p.slug, expected: p.taxCode })),
      ...AUXILIARY_IDS.map((id) => ({ id, expected: DEFAULT_TAX_CODE })),
    ];

    const rows: TaxCodeCheckRow[] = [];
    for (const t of targets) {
      try {
        const product = await stripe.products.retrieve(t.id);
        const actual = typeof product.tax_code === "string" ? product.tax_code : (product.tax_code?.id ?? null);
        rows.push({ id: t.id, expected: t.expected, actual, ok: actual === t.expected });
      } catch (error) {
        rows.push({
          id: t.id,
          expected: t.expected,
          actual: null,
          ok: false,
          error: getStripeErrorMessage(error),
        });
      }
    }

    return { rows, allOk: rows.every((r) => r.ok) };
  });
