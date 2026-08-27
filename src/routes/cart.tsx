import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Receipt, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart";
import { PRODUCTS_BY_SLUG, formatPrice } from "@/lib/products";
import { priceBreakdown, VAT_RATE, APOSTILLE_FEE, supportsApostille } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

const TITLE = "Your cart — Companies House Cyprus";
const DESCRIPTION = "Review the Cyprus certificates and company reports you are about to order.";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, serviceFee, apostilleFee, vat, total, removeItem, updateQuantity, clear } = useCart();

  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Documents are delivered digitally to the email address you confirm at checkout.
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border bg-card p-12 text-center shadow-panel">
          <ShoppingCart className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">Your cart is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Find a company on the register, or start from the product catalogue.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link to="/search" search={{ q: "", page: 1 }}>Search the register</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pricing">View products</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <ul className="space-y-4">
            {items.map((item, index) => {
              const product = PRODUCTS_BY_SLUG[item.productSlug];
              if (!product) return null;
              const breakdown = priceBreakdown(product, item.quantity, { apostille: item.apostille });
              return (
                <li key={`${item.productSlug}-${item.companySlug ?? "none"}`} className="rounded-xl border bg-card p-5 shadow-panel">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="font-display font-semibold">{product.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.companyName ? (
                          <>
                            For{" "}
                            {item.companySlug ? (
                              <Link to="/company/$slug" params={{ slug: item.companySlug }} className="text-copper hover:underline">
                                {item.companyName}
                              </Link>
                            ) : (
                              item.companyName
                            )}
                            {item.companyNumber ? ` · ${item.companyNumber}` : ""}
                          </>
                        ) : (
                          "Company to be confirmed at checkout"
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Delivery: {product.delivery}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <Receipt className="size-3.5" />
                        <span>{formatPrice(breakdown.documentPrice)} document</span>
                        {breakdown.serviceFee > 0 && (
                          <>
                            <span className="text-border">|</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-copper/10 px-2 py-0.5 text-copper font-medium">
                              {formatPrice(breakdown.serviceFee)} service fee (€50 per certificate)
                            </span>
                          </>
                        )}
                        {breakdown.apostilleFee > 0 && (
                          <>
                            <span className="text-border">|</span>
                            <span>{formatPrice(breakdown.apostilleFee)} apostille</span>
                          </>
                        )}
                        <span className="text-border">|</span>
                        <span>{formatPrice(breakdown.vat)} VAT</span>
                      </div>
                      {supportsApostille(product) && breakdown.apostilleFee === 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Apostille certification ({formatPrice(APOSTILLE_FEE)} per certificate) can be added at checkout.
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(breakdown.total)}</p>
                      <p className="text-xs text-muted-foreground">incl. VAT</p>
                      <div className="mt-3 flex items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => updateQuantity(index, item.quantity - 1)}
                          className="flex size-7 items-center justify-center rounded border hover:bg-muted"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => updateQuantity(index, item.quantity + 1)}
                          className="flex size-7 items-center justify-center rounded border hover:bg-muted"
                        >
                          <Plus className="size-3" />
                        </button>
                        <button
                          type="button"
                          aria-label="Remove item"
                          onClick={() => removeItem(index)}
                          className="ml-2 flex size-7 items-center justify-center rounded border text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            <li>
              <CrossSellSuggestions />
            </li>
            <li>
              <Button variant="ghost" size="sm" onClick={clear}>
                Clear cart
              </Button>
            </li>
          </ul>

          <aside className="h-fit rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {serviceFee > 0 && (
                <div className="flex justify-between">
                  <dt className="inline-flex items-center gap-1.5 rounded-full bg-copper/10 px-2 py-0.5 text-copper text-xs font-medium">
                    Service fee (€50 per certificate)
                  </dt>
                  <dd className="font-medium">{formatPrice(serviceFee)}</dd>
                </div>
              )}
              {apostilleFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Apostille ({formatPrice(APOSTILLE_FEE)} per certificate)</dt>
                  <dd className="font-medium">{formatPrice(apostilleFee)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT ({Math.round(VAT_RATE * 100)}%) — reports &amp; service fee</dt>
                <dd>{formatPrice(vat)}</dd>
              </div>
              <div className="flex justify-between border-t pt-3 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link to="/checkout">Continue to payment</Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Card payments are processed securely by Stripe on the next step.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
