import { Sparkles } from "lucide-react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { useCart } from "@/lib/cart";
import { crossSellSuggestions } from "@/lib/cross-sell";
import { formatPrice } from "@/lib/products";

export function CrossSellSuggestions({ className }: { className?: string }) {
  const { items } = useCart();
  const suggestions = crossSellSuggestions(items);
  if (suggestions.length === 0) return null;

  return (
    <section className={className}>
      <div className="rounded-xl border border-copper/30 bg-copper/5 p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold">
          <Sparkles className="size-4 text-copper" />
          Frequently ordered together
        </h2>
        <ul className="mt-4 space-y-3">
          {suggestions.map((s) => (
            <li
              key={`${s.product.slug}-${s.companySlug ?? "none"}`}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4"
            >
              <div className="min-w-[220px] flex-1">
                <p className="text-sm font-semibold">{s.product.name}</p>
                {s.companyName && (
                  <p className="text-xs text-muted-foreground">
                    For {s.companyName}
                    {s.companyNumber ? ` · ${s.companyNumber}` : ""}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-copper">{formatPrice(s.product.price)}</span>
                <AddToCartButton
                  productSlug={s.product.slug}
                  companySlug={s.companySlug}
                  companyName={s.companyName}
                  companyNumber={s.companyNumber}
                  size="sm"
                  variant="outline"
                  label="Add"
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
