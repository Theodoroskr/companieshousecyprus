import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRODUCTS } from "@/lib/products";
import { createStripeClient, type StripeEnv, getStripeErrorMessage } from "@/lib/stripe.server";

export type SyncTaxCodesResult = {
  updated: string[];
  errors: string[];
  environment: StripeEnv;
};

/** Stripe tax code for "General - Electronically Supplied Services" (SaaS / digital services). */
export const DEFAULT_TAX_CODE = "txcd_10103001";

/** Auxiliary checkout products that are not listed in the public catalog. */
const AUXILIARY_PRODUCTS: { id: string; taxCode: string }[] = [
  { id: "apostille-service", taxCode: DEFAULT_TAX_CODE },
  { id: "certificate-service-fee", taxCode: DEFAULT_TAX_CODE },
];

export const syncProductTaxCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => {
    if (!data.environment || (data.environment !== "sandbox" && data.environment !== "live")) {
      throw new Error("Invalid environment");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<SyncTaxCodesResult> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const stripe = createStripeClient(data.environment);
    const updated: string[] = [];
    const errors: string[] = [];

    const targets = [
      ...PRODUCTS.map((p) => ({ id: p.slug, taxCode: p.taxCode })),
      ...AUXILIARY_PRODUCTS,
    ];

    for (const target of targets) {
      try {
        const prices = await stripe.prices.list({ lookup_keys: [target.id], limit: 1 });
        const price = prices.data[0];
        if (!price) {
          errors.push(`${target.id}: no Stripe price found for this lookup key`);
          continue;
        }
        const productId = typeof price.product === "string" ? price.product : price.product.id;
        await stripe.products.update(productId, { tax_code: target.taxCode });
        updated.push(target.id);
      } catch (error) {
        errors.push(`${target.id}: ${getStripeErrorMessage(error)}`);
      }
    }

    return { updated, errors, environment: data.environment };
  });
