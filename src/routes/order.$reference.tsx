import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, CreditCard, Download, FileText, Loader2, ShieldCheck } from "lucide-react";
import { fetchOrder, orderDocumentUrl, startStripeOrderPayment, syncOrderPayment } from "@/lib/orders.functions";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { formatPrice } from "@/lib/products";
import { Button } from "@/components/ui/button";


const TITLE = "Order status — Companies House Cyprus";

export const Route = createFileRoute("/order/$reference")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({ token: String(search["token"] ?? "") }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: "Track your Cyprus Registrar certificate and report order." },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: "Track your Cyprus Registrar certificate and report order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

const euros = (cents: number) => formatPrice(cents / 100);

const STATUS_COPY: Record<string, string> = {
  awaiting_payment: "Awaiting payment confirmation",
  paid: "Payment received — in production",
  processing: "In production",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderPage() {
  const { reference } = Route.useParams();
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState(token);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const load = useServerFn(fetchOrder);
  const startStripe = useServerFn(startStripeOrderPayment);
  const syncPayment = useServerFn(syncOrderPayment);
  const getDocumentUrl = useServerFn(orderDocumentUrl);
  const { openCheckout, checkoutElement, isOpen } = useStripeCheckout();

  useEffect(() => setTokenInput(token), [token]);

  const query = useQuery({
    queryKey: ["order", reference, token],
    queryFn: () => load({ data: { reference, token } }),
    enabled: token.length > 0,
    refetchInterval: 60_000,
  });

  const refetch = query.refetch;
  // Reconcile with Revolut when the customer returns from the hosted checkout.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const result = await syncPayment({ data: { reference, token } });
        if (!cancelled && result.paid) {
          void refetch();
          return;
        }
      } catch {
        /* ignore transient sync errors */
      }
      if (!cancelled && attempts < 5) setTimeout(() => void tick(), 4000);
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [reference, token, syncPayment, refetch]);


  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <h1 className="font-display text-2xl font-bold">Find your order</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter the access key from your confirmation for reference{" "}
          <span className="font-mono font-semibold text-foreground">{reference}</span>.
        </p>
        <form
          className="mt-6 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/order/$reference", params: { reference }, search: { token: tokenInput.trim() } });
          }}
        >
          <input
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Access key"
            className="h-11 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-ring"
          />
          <Button type="submit">Open</Button>
        </form>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-24 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading your order…
      </div>
    );
  }

  const data = query.data;
  if (!data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check the reference and access key in your confirmation, or contact us.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link to="/contact">Contact support</Link>
        </Button>
      </div>
    );
  }

  const { order, items } = data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <div className="rounded-xl border bg-card p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Order reference</p>
            <h1 className="font-display text-2xl font-bold">{order.reference}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Placed {new Date(order.created_at).toLocaleString("en-GB")} · {order.email}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium">
            {order.status === "delivered" ? (
              <CheckCircle2 className="size-4 text-olive" />
            ) : (
              <Clock className="size-4 text-copper" />
            )}
            {STATUS_COPY[order.status] ?? order.status}
          </span>
        </div>

        {order.status === "awaiting_payment" ? (
          isOpen ? (
            <div className="mt-6">{checkoutElement}</div>
          ) : (
            <div className="mt-6 rounded-lg border border-copper/40 bg-copper/5 p-5">
              <p className="flex items-center gap-2 font-semibold">
                <CreditCard className="size-4 text-copper" /> Pay securely to start production
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete payment for {euros(order.total_cents)}. Documents are retrieved automatically once the payment clears.
              </p>
              {payError && <p className="mt-3 text-sm text-destructive">{payError}</p>}
              <Button
                className="mt-4"
                disabled={paying}
                onClick={async () => {
                  setPaying(true);
                  setPayError(null);
                  try {
                    const result = await startStripe({ data: { reference, token } });
                    if (result.ok) {
                      openCheckout({ reference, token });
                    }
                  } catch (error) {
                    setPayError(error instanceof Error ? error.message : "Could not start the payment");
                  } finally {
                    setPaying(false);
                  }
                }}
              >
                {paying ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />}
                {paying ? "Opening checkout…" : `Pay ${euros(order.total_cents)}`}
              </Button>
            </div>
          )
        ) : (
          <p className="mt-6 flex items-center gap-2 rounded-lg border border-olive/40 bg-olive/5 p-4 text-sm">
            <CheckCircle2 className="size-4 text-olive" /> Payment received. We're preparing your documents.
          </p>
        )}



        <ul className="mt-8 space-y-4">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border bg-background p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <FileText className="size-4 text-copper" />
                    {item.product_name}
                    {item.quantity > 1 ? ` × ${item.quantity}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.company_name ?? "Company to be confirmed"}
                    {item.company_number ? ` · ${item.company_number}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {euros(item.document_price_cents)}
                    {item.service_fee_cents > 0 ? ` + ${euros(item.service_fee_cents)} service fee` : ""} +{" "}
                    {euros(item.vat_cents)} VAT
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{euros(item.total_cents)}</p>
                  <p className="text-xs capitalize text-muted-foreground">{item.fulfilment_status}</p>
                </div>
              </div>

              {item.reportJson && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([item.reportJson ?? ""], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `${order.reference}-${item.product_slug}.json`;
                      link.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="size-4" /> Download report
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Delivered {item.delivered_at ? new Date(item.delivered_at).toLocaleString("en-GB") : ""}
                  </span>
                </div>
              )}
              {(item.order_documents?.length ?? 0) > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  {[...(item.order_documents ?? [])]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((doc) => (
                      <Button
                        key={doc.id}
                        size="sm"
                        onClick={async () => {
                          const { url } = await getDocumentUrl({
                            data: {
                              itemId: item.id,
                              reference: order.reference,
                              token: token ?? "",
                              documentId: doc.id,
                            },
                          });
                          window.open(url, "_blank", "noopener");
                        }}
                      >
                        <Download className="size-4" /> {doc.name}
                      </Button>
                    ))}
                  <span className="text-xs text-muted-foreground">
                    Delivered {item.delivered_at ? new Date(item.delivered_at).toLocaleString("en-GB") : ""}
                  </span>
                </div>
              )}

              {item.fulfilment_status === "failed" && (
                <p className="mt-3 rounded-md border border-copper/40 bg-copper/5 p-3 text-xs text-muted-foreground">
                  We hit an issue retrieving this document automatically. Our team has been notified and will follow up
                  by email.
                </p>
              )}
            </li>
          ))}
        </ul>

        <dl className="mt-8 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{euros(order.subtotal_cents)}</dd>
          </div>
          {order.service_fee_cents > 0 && (
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Service fee</dt>
              <dd>{euros(order.service_fee_cents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted-foreground">VAT (19%)</dt>
            <dd>{euros(order.vat_cents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{euros(order.total_cents)}</dd>
          </div>
        </dl>

        <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-olive" />
          Keep this page link — it is the private access key to your documents. Do not share it publicly.
        </p>
      </div>
    </div>
  );
}
