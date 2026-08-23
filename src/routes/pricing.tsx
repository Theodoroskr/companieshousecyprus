import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { PRODUCTS, CATEGORY_LABEL, formatPrice, type ProductCategory } from "@/lib/products";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";

const TITLE = "Pricing — Cyprus certificates & company reports";
const DESCRIPTION =
  "Transparent pricing for Cyprus Registrar certificates, company profiles, credit reports and KYB bundles. Digital delivery in 1–2 business days.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

const ORDER: ProductCategory[] = ["certificate", "report", "pack"];

function PricingPage() {
  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Pricing</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold md:text-5xl">
            One flat price per document. No subscription.
          </h1>
          <p className="mt-5 max-w-2xl text-primary-foreground/75">
            Every certificate is sourced from the Cyprus Department of Registrar of Companies. Prices are per company,
            exclusive of 19% Cyprus VAT where applicable.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-16">
        {ORDER.map((category) => (
          <section key={category}>
            <div className="flex items-end justify-between gap-4 border-b pb-4">
              <h2 className="text-2xl font-semibold">{CATEGORY_LABEL[category]}</h2>
              <p className="text-sm text-muted-foreground">Digital PDF · apostille available</p>
            </div>
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {PRODUCTS.filter((product) => product.category === category).map((product) => (
                <article
                  key={product.slug}
                  className="relative flex flex-col rounded-xl border bg-card p-6 shadow-panel transition-shadow hover:shadow-lift"
                >
                  {product.popular && (
                    <span className="absolute -top-3 left-6 rounded-full bg-copper px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-copper-foreground">
                      Most ordered
                    </span>
                  )}
                  <h3 className="font-display text-lg font-semibold">{product.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{product.tagline}</p>
                  <p className="mt-5 font-display text-3xl font-bold">
                    {formatPrice(product.price)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/ company</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Delivery: {product.delivery}</p>
                  <ul className="mt-5 space-y-2 text-sm">
                    {product.includes.slice(0, 4).map((item) => (
                      <li key={item.title} className="flex gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-olive" />
                        <span>{item.title}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex flex-col gap-2 pt-2">
                    <AddToCartButton productSlug={product.slug} />
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/report/$type" params={{ type: product.slug }}>
                        What's included <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-xl border bg-sand p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Ordering in volume?</h2>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Law firms, corporate service providers and banks can run bulk certificate orders and scheduled
                monitoring on the whole Cyprus register. Talk to us about account pricing.
              </p>
            </div>
            <Button asChild size="lg">
              <Link to="/contact">Request account pricing</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
