import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { PRODUCTS, formatPrice } from "@/lib/products";
import { syncProductTaxCodes, type SyncTaxCodesResult } from "@/lib/products-sync.functions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/admin/products")({
  head: () => ({
    meta: [
      { title: "Products & tax codes — Admin" },
      { name: "description", content: "Review catalogue tax codes and sync them to Stripe." },
      { property: "og:title", content: "Products & tax codes — Admin" },
      { property: "og:description", content: "Review catalogue tax codes and sync them to Stripe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const sync = useServerFn(syncProductTaxCodes);
  const [environment, setEnvironment] = useState<"sandbox" | "live">("sandbox");
  const [result, setResult] = useState<SyncTaxCodesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await sync({ environment });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Products & tax codes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Every catalogue item is classified as General - Electronically Supplied Services ({"txcd_10103001"}).
        Use the sync button to push the current tax code to Stripe products in the selected environment.
      </p>

      <section className="mt-6 rounded-xl border bg-card p-4">
        <h2 className="font-display text-base font-semibold">Catalogue tax codes</h2>
        <ul className="mt-4 divide-y">
          {PRODUCTS.map((product) => (
            <li key={product.slug} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.slug}</p>
              </div>
              <div className="text-right text-sm">
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">{product.taxCode}</span>
                <span className="ml-2 text-muted-foreground">{formatPrice(product.price)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-4">
        <h2 className="font-display text-base font-semibold">Sync to Stripe</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This updates each Stripe product&apos;s tax_code field. It does not change prices or names.
        </p>

        <div className="mt-4">
          <RadioGroup
            value={environment}
            onValueChange={(value) => setEnvironment(value as "sandbox" | "live")}
            className="flex flex-wrap gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sandbox" id="env-sandbox" />
              <Label htmlFor="env-sandbox">Test environment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="live" id="env-live" />
              <Label htmlFor="env-live">Live environment</Label>
            </div>
          </RadioGroup>
        </div>

        <Button
          className="mt-6"
          onClick={handleSync}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Sync tax codes to Stripe
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Sync failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="mt-4 space-y-3">
            <Alert variant={result.errors.length ? "destructive" : "default"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>
                {result.errors.length ? "Sync completed with errors" : "Sync completed"}
              </AlertTitle>
              <AlertDescription>
                Updated {result.updated.length} products in the {result.environment} environment.
                {result.errors.length > 0 && ` ${result.errors.length} errors.`}
              </AlertDescription>
            </Alert>

            {result.updated.length > 0 && (
              <div className="rounded-lg border bg-background/60 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Updated</p>
                <p className="mt-1 text-xs">{result.updated.join(", ")}</p>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="rounded-lg border bg-destructive/5 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive">Errors</p>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-destructive">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
