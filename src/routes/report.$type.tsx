import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Clock, FileText, Receipt, Search, ShieldCheck } from "lucide-react";
import { PRODUCTS, PRODUCTS_BY_SLUG, formatPrice } from "@/lib/products";
import { priceBreakdown, CERTIFICATE_SERVICE_FEE, VAT_RATE } from "@/lib/pricing";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/report/$type")({
  loader: ({ params }) => {
    const product = PRODUCTS_BY_SLUG[params.type];
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Product not found — Companies House Cyprus" }, { name: "robots", content: "noindex" }] };
    }
    const { product } = loaderData;
    const title = `${product.name} for Cyprus companies — ${formatPrice(product.price)}`;
    return {
      meta: [
        { title },
        { name: "description", content: product.tagline },
        { property: "og:title", content: title },
        { property: "og:description", content: product.tagline },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: ProductNotFound,
  component: ReportPage,
});

function ProductNotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Product not found</h1>
      <p className="mt-3 text-muted-foreground">This document isn't in our catalogue.</p>
      <Button asChild className="mt-6">
        <Link to="/pricing">View all products</Link>
      </Button>
    </div>
  );
}

function ReportPage() {
  const { product } = Route.useLoaderData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const related = PRODUCTS.filter((item) => item.slug !== product.slug).slice(0, 3);

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[1.4fr_1fr] lg:py-20">
          <div>
            <nav className="flex items-center gap-2 text-xs text-primary-foreground/60">
              <Link to="/" className="hover:text-primary-foreground">Home</Link>
              <span>/</span>
              <Link to="/pricing" className="hover:text-primary-foreground">Products</Link>
              <span>/</span>
              <span className="text-primary-foreground/90">{product.name}</span>
            </nav>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-copper">{product.eyebrow}</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-bold md:text-5xl">{product.headline}</h1>
            <p className="mt-5 max-w-2xl text-lg text-primary-foreground/75">{product.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-5 text-sm text-primary-foreground/80">
              <span className="inline-flex items-center gap-2"><Clock className="size-4 text-copper" />{product.delivery}</span>
              <span className="inline-flex items-center gap-2"><FileText className="size-4 text-copper" />Digital PDF</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-copper" />Registrar sourced</span>
            </div>
          </div>

          <aside className="rounded-xl border border-white/15 bg-white/8 p-6 backdrop-blur">
            <p className="font-display text-4xl font-bold">{formatPrice(product.price)}</p>
            <p className="mt-1 text-sm text-primary-foreground/70">per company · excl. VAT</p>
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (q.trim()) navigate({ to: "/search", search: { q: q.trim(), page: 1 } });
              }}
            >
              <label className="text-xs font-medium uppercase tracking-wide text-primary-foreground/70">
                Which company?
              </label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary-foreground/50" />
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Company name or HE number"
                  className="h-11 w-full rounded-md border border-white/20 bg-white/10 pl-9 pr-3 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none focus:border-copper"
                />
              </div>
              <Button type="submit" variant="secondary" className="mt-3 w-full">
                Find company <ArrowRight className="size-4" />
              </Button>
            </form>
            <div className="mt-4 border-t border-white/15 pt-4">
              <AddToCartButton
                productSlug={product.slug}
                label="Add to cart without company"
                className="w-full bg-copper text-copper-foreground hover:bg-copper/90"
              />
              <p className="mt-3 text-xs text-primary-foreground/60">
                You can name the company at checkout. Payment is not yet enabled — orders are confirmed by our team.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold">About this document</h2>
            {product.description.map((paragraph) => (
              <p key={paragraph} className="mt-4 leading-relaxed text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </section>

          <section>
            <h2 className="text-2xl font-semibold">What's included</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {product.includes.map((item) => (
                <div key={item.title} className="rounded-lg border bg-card p-5 shadow-panel">
                  <div className="flex items-start gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-olive" />
                    <div>
                      <h3 className="text-sm font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-sand p-6">
            <h2 className="text-lg font-semibold">Typically ordered for</h2>
            <p className="mt-2 text-sm text-muted-foreground">{product.typicalUse}</p>
          </section>
        </div>

        <aside className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How ordering works</h2>
            <ol className="mt-4 space-y-4 text-sm">
              {[
                "Find the company on the Cyprus register",
                "Add the certificate or report to your cart",
                "Confirm your details at checkout",
                "Receive the signed PDF by email",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Also ordered</h2>
            <ul className="mt-4 space-y-3">
              {related.map((item) => (
                <li key={item.slug}>
                  <Link
                    to="/report/$type"
                    params={{ type: item.slug }}
                    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors hover:border-copper"
                  >
                    <span>{item.name}</span>
                    <span className="shrink-0 font-medium text-copper">{formatPrice(item.price)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
