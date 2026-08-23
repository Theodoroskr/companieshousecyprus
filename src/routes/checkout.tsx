import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Lock } from "lucide-react";
import { useCart, CART_VAT_RATE, CART_SERVICE_FEE } from "@/lib/cart";
import { PRODUCTS_BY_SLUG, formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";

const TITLE = "Checkout — Companies House Cyprus";
const DESCRIPTION = "Confirm your order details for Cyprus Registrar certificates and company reports.";

export const Route = createFileRoute("/checkout")({
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
  component: CheckoutPage,
});

const FIELDS = [
  { name: "fullName", label: "Full name", type: "text", placeholder: "Andreas Georgiou", required: true },
  { name: "email", label: "Email for delivery", type: "email", placeholder: "you@firm.com.cy", required: true },
  { name: "company", label: "Your company / firm", type: "text", placeholder: "Georgiou & Partners LLC", required: false },
  { name: "vat", label: "VAT number (optional)", type: "text", placeholder: "CY10123456X", required: false },
  { name: "phone", label: "Phone", type: "tel", placeholder: "+357 22 000 000", required: false },
] as const;

function CheckoutPage() {
  const { items, subtotal, serviceFee, vat, total, clear } = useCart();
  const [placed, setPlaced] = useState<string | null>(null);

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto size-12 text-olive" />
        <h1 className="mt-6 text-3xl font-bold">Order request received</h1>
        <p className="mt-3 text-muted-foreground">
          Reference <span className="font-mono font-semibold text-foreground">{placed}</span>. Our team will confirm
          availability and send a payment link before the documents are issued.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/search" search={{ q: "", page: 1 }}>Search another company</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-14">
      <h1 className="text-3xl font-bold">Checkout</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Card payments are not live yet. Submit your details and we'll confirm the order and invoice you.
      </p>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border bg-card p-12 text-center shadow-panel">
          <h2 className="text-lg font-semibold">Nothing to check out</h2>
          <Button asChild className="mt-5">
            <Link to="/pricing">Browse products</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <form
            className="rounded-xl border bg-card p-6 shadow-panel"
            onSubmit={(event) => {
              event.preventDefault();
              const reference = `CHC-${Date.now().toString(36).toUpperCase().slice(-6)}`;
              clear();
              setPlaced(reference);
            }}
          >
            <h2 className="font-display text-lg font-semibold">Your details</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <label key={field.name} className={field.name === "fullName" || field.name === "email" ? "sm:col-span-2" : ""}>
                  <span className="text-sm font-medium">{field.label}</span>
                  <input
                    name={field.name}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
                  />
                </label>
              ))}
              <label className="sm:col-span-2">
                <span className="text-sm font-medium">Notes for our team (optional)</span>
                <textarea
                  name="notes"
                  rows={3}
                  placeholder="Apostille required, certified translation, urgency…"
                  className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
                />
              </label>
            </div>
            <Button type="submit" size="lg" className="mt-6 w-full">
              <Lock className="size-4" /> Submit order request
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              By submitting you agree to our{" "}
              <Link to="/terms" className="underline">terms of service</Link> and{" "}
              <Link to="/privacy" className="underline">privacy policy</Link>.
            </p>
          </form>

          <aside className="h-fit rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="font-display text-lg font-semibold">Order summary</h2>
            <ul className="mt-5 space-y-3 text-sm">
              {items.map((item) => {
                const product = PRODUCTS_BY_SLUG[item.productSlug];
                if (!product) return null;
                return (
                  <li key={`${item.productSlug}-${item.companySlug ?? "none"}`} className="flex justify-between gap-4">
                    <span>
                      {product.name}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                      <span className="block text-xs text-muted-foreground">
                        {item.companyName ?? "Company confirmed at checkout"}
                      </span>
                    </span>
                    <span className="shrink-0">{formatPrice(product.price * item.quantity)}</span>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              {serviceFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Service fee ({formatPrice(CART_SERVICE_FEE)} per certificate)</dt>
                  <dd>{formatPrice(serviceFee)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">VAT ({Math.round(CART_VAT_RATE * 100)}%)</dt>
                <dd>{formatPrice(vat)}</dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd>{formatPrice(total)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}
