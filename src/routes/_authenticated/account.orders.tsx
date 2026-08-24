import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, Clock, CreditCard, FileText, Loader2, Mail, PackageSearch, Phone, Receipt, ShieldCheck, User } from "lucide-react";
import { listMyOrders, type OrderListItem } from "@/lib/orders.functions";
import { formatPrice } from "@/lib/products";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { useAccount } from "@/hooks/useAccount";


const TITLE = "My orders — Companies House Cyprus";
const DESCRIPTION = "Sign in to review your Cyprus Registrar certificate and report orders, payment status and deliveries.";

export const Route = createFileRoute("/_authenticated/account/orders")({
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
  component: MyOrdersPage,
});

const euros = (cents: number) => formatPrice(cents / 100);

const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  awaiting_payment: { label: "Awaiting payment", tone: "bg-copper/15 text-copper" },
  paid: { label: "Paid — in production", tone: "bg-primary/10 text-primary" },
  processing: { label: "In production", tone: "bg-primary/10 text-primary" },
  delivered: { label: "Delivered", tone: "bg-olive/15 text-olive" },
  cancelled: { label: "Cancelled", tone: "bg-destructive/10 text-destructive" },
};

const ITEM_STATUS: Record<string, { label: string; icon: typeof Clock }> = {
  pending: { label: "Queued", icon: Clock },
  processing: { label: "In production", icon: Loader2 },
  delivered: { label: "Ready to download", icon: CheckCircle2 },
  failed: { label: "Needs attention", icon: FileText },
};

function progressFor(status: string, items: { fulfilment_status: string }[]) {
  if (status === "awaiting_payment") return 10;
  if (status === "cancelled") return 0;
  if (!items.length) return 40;
  const delivered = items.filter((item) => item.fulfilment_status === "delivered").length;
  return Math.max(40, Math.round(40 + (delivered / items.length) * 60));
}

type DetailRow = { icon: typeof User; label: string; value: string | null | undefined };

function DetailItem({ icon: Icon, label, value }: DetailRow) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-copper/10 text-copper">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium">{value?.trim() ? value : "—"}</span>
      </span>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MyOrdersPage() {
  const load = useServerFn(listMyOrders);
  const query = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => load(),
    refetchInterval: 60_000,
  });

  const orders = query.data?.orders ?? [];
  const account = useAccount();

  const profile = orders.find((order: OrderListItem) => order.full_name || order.firm || order.phone);
  const paidOrders = orders.filter((order: OrderListItem) => order.status !== "awaiting_payment" && order.status !== "cancelled");
  const totalSpent = paidOrders.reduce((sum: number, order: OrderListItem) => sum + (order.total_cents ?? 0), 0);
  const documentsReady = orders.reduce(
    (sum: number, order: OrderListItem) =>
      sum + (order.order_items ?? []).filter((item) => item.fulfilment_status === "delivered").length,
    0,
  );
  const awaiting = orders.filter((order: OrderListItem) => order.status === "awaiting_payment").length;
  const memberSince = orders.length ? orders[orders.length - 1]!.created_at : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">Client portal</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My orders</h1>
            {account.ready && account.signedIn && (
              <span className="rounded-full border border-copper/40 bg-copper/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-copper">
                {account.accountType === "admin" ? "Admin account" : "Client account"}
              </span>
            )}
          </div>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every certificate and report ordered with{" "}
            <span className="font-medium text-foreground">{query.data?.email || "your account email"}</span>, with live
            payment and delivery progress.
          </p>
        </div>
        <SignOutButton />
      </header>

      {orders.length > 0 && (
        <section className="mb-8 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your details</h2>
              {memberSince ? (
                <span className="text-xs text-muted-foreground">Client since {formatDate(memberSince)}</span>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailItem icon={User} label="Contact name" value={profile?.full_name} />
              <DetailItem icon={Mail} label="Delivery email" value={query.data?.email || profile?.email} />
              <DetailItem icon={Building2} label="Company / firm" value={profile?.firm} />
              <DetailItem icon={Receipt} label="VAT number" value={profile?.vat_number} />
              <DetailItem icon={Phone} label="Phone" value={profile?.phone} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              These details come from your most recent order. Update them at checkout on your next purchase.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <StatCard label="Orders" value={String(orders.length)} hint={awaiting ? `${awaiting} awaiting payment` : "All settled"} />
            <StatCard label="Documents ready" value={String(documentsReady)} hint="Available to download" />
            <StatCard label="Total paid" value={euros(totalSpent)} hint="Excluding unpaid orders" />
            <StatCard
              label="Last order"
              value={(orders[0] ? formatDate(orders[0].created_at) : null) || "—"}
              hint={orders[0]?.reference ?? undefined}
            />
          </div>
        </section>
      )}


      {account.isAdmin && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl border border-copper/40 bg-copper/5 p-4">
          <ShieldCheck className="size-5 text-copper" />
          <p className="mr-auto text-sm">
            <span className="font-semibold text-copper">Admin access</span> — manage every customer order and imports.
          </p>
          <Button asChild size="sm" variant="outline"><Link to="/admin/orders">All orders</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/admin/import">Data import</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/admin/api4all">API4ALL</Link></Button>
        </div>
      )}

      {query.isLoading ? (
        <div className="flex items-center gap-3 rounded-xl border bg-card p-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Loading your orders…
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          We could not load your orders. Please refresh the page or contact info@companieshousecyprus.com.
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center">
          <PackageSearch className="mx-auto size-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-semibold">No orders yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Orders placed with this email address will appear here automatically, including certificates ordered before
            you created the account.
          </p>
          <Button asChild className="mt-6">
            <Link to="/search" search={{ q: "", page: 1 }}>Order a certificate</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid gap-5">
          {orders.map((order: OrderListItem) => {
            const items = order.order_items ?? [];
            const status = ORDER_STATUS[order.status] ?? { label: order.status, tone: "bg-muted text-muted-foreground" };
            const progress = progressFor(order.status, items);
            return (
              <li key={order.id} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 px-5 py-4">
                  <div>
                    <p className="font-mono text-sm font-semibold">{order.reference}</p>
                    <p className="text-xs text-muted-foreground">Placed {formatDate(order.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                    <span className="text-sm font-semibold">{euros(order.total_cents)}</span>
                  </div>
                </div>

                <div className="px-5 py-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-copper transition-all" style={{ width: `${progress}%` }} />
                  </div>

                  <ul className="mt-4 grid gap-2">
                    {items.map((item: OrderListItem["order_items"][number]) => {
                      const meta = ITEM_STATUS[item.fulfilment_status] ?? ITEM_STATUS["pending"]!;
                      const Icon = meta.icon;
                      return (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="font-medium">{item.product_name}</span>
                            {item.company_name ? (
                              <span className="text-muted-foreground"> — {item.company_name}</span>
                            ) : null}
                            {item.company_number ? (
                              <span className="font-mono text-xs text-muted-foreground"> · {item.company_number}</span>
                            ) : null}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                            <Icon className={`size-4 ${item.fulfilment_status === "processing" ? "animate-spin" : ""}`} />
                            {meta.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button asChild size="sm">
                      <Link to="/order/$reference" params={{ reference: order.reference }} search={{ token: order.access_token }}>
                        View order &amp; downloads
                      </Link>
                    </Button>
                    {order.status === "awaiting_payment" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/order/$reference" params={{ reference: order.reference }} search={{ token: order.access_token }}>
                          <CreditCard className="mr-1.5 size-4" /> Complete payment
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
