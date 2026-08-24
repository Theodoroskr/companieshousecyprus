import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Printer } from "lucide-react";
import { adminReleaseReport, adminReviewReport } from "@/lib/orders.functions";
import { ReportView } from "@/components/report/ReportView";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/reports/$itemId")({
  head: () => ({
    meta: [
      { title: "Review report — Admin" },
      { name: "description", content: "Review an API4ALL report before releasing it to the client." },
      { property: "og:title", content: "Review report — Admin" },
      { property: "og:description", content: "Review an API4ALL report before releasing it to the client." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminReportReviewPage,
});

function AdminReportReviewPage() {
  const { itemId } = Route.useParams();
  const navigate = useNavigate();
  const load = useServerFn(adminReviewReport);
  const release = useServerFn(adminReleaseReport);
  const [notify, setNotify] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const query = useQuery({ queryKey: ["admin", "report", itemId], queryFn: () => load({ data: { itemId } }) });

  const releaseMutation = useMutation({
    mutationFn: () => release({ data: { itemId, notify } }),
    onSuccess: (result) => {
      setMessage(
        result.notified
          ? "Report released — the client has been emailed and can download it from the portal."
          : "Report released to the client portal.",
      );
      void query.refetch();
      setTimeout(() => void navigate({ to: "/admin/orders", search: { view: "open" } }), 1200);
    },
    onError: (error) => setMessage(error instanceof Error ? error.message : "Could not release the report"),
  });

  const meta = query.data?.meta;
  const released = meta?.fulfilmentStatus === "delivered";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/orders" search={{}}>
            <ArrowLeft className="size-4" /> Back to orders
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs">
            <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />
            Email the client on release
          </label>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print
          </Button>
          <Button size="sm" disabled={releaseMutation.isPending || released} onClick={() => releaseMutation.mutate()}>
            {releaseMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            {released ? "Already released" : "Release to client"}
          </Button>
        </div>
      </div>

      {message && <p className="no-print mb-5 rounded-md border bg-card p-3 text-sm">{message}</p>}

      {meta ? (
        <div className="no-print mb-5 grid gap-3 rounded-xl border bg-muted/20 p-4 text-sm sm:grid-cols-4">
          <span>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">Order</span>
            <span className="font-mono">{meta.reference}</span>
          </span>
          <span>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">Client</span>
            {meta.customer ?? "—"}
          </span>
          <span>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">Email</span>
            {meta.email ?? "—"}
          </span>
          <span>
            <span className="block text-xs uppercase tracking-wide text-muted-foreground">Status</span>
            {meta.fulfilmentStatus.replace(/_/g, " ")}
          </span>
        </div>
      ) : null}

      {query.isLoading ? (
        <p className="flex items-center gap-2 rounded-xl border bg-card p-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading report…
        </p>
      ) : query.isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Could not load this report."}
        </p>
      ) : query.data?.report && meta ? (
        <ReportView
          report={query.data.report}
          meta={{
            reference: meta.reference,
            productName: meta.productName,
            deliveredAt: meta.deliveredAt,
            watermark: released ? null : "Internal review copy — not yet released to the client",
          }}
        />
      ) : (
        <p className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          No report JSON is stored for this order line yet.
        </p>
      )}
    </div>
  );
}
