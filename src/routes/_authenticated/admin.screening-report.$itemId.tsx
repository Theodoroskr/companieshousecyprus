import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RefreshCw, Send } from "lucide-react";
import { adminReleaseReport, adminReviewSnapshot, adminRerunSnapshot } from "@/lib/orders.functions";
import { SanctionsSnapshotView } from "@/components/report/SanctionsSnapshotView";
import { Button } from "@/components/ui/button";

const TITLE = "Review sanctions screening — Companies House Cyprus";

export const Route = createFileRoute("/_authenticated/admin/screening-report/$itemId")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: "Analyst review of an entity-only Sanctions Risk Snapshot before release." },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: "Analyst review of an entity-only Sanctions Risk Snapshot before release." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminSnapshotReview,
});

function AdminSnapshotReview() {
  const { itemId } = Route.useParams();
  const queryClient = useQueryClient();
  const load = useServerFn(adminReviewSnapshot);
  const release = useServerFn(adminReleaseReport);
  const rerun = useServerFn(adminRerunSnapshot);

  const query = useQuery({ queryKey: ["admin-snapshot", itemId], queryFn: () => load({ data: { itemId } }) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-snapshot", itemId] });
  const releaseMutation = useMutation({ mutationFn: () => release({ data: { itemId } }), onSuccess: invalidate });
  const rerunMutation = useMutation({ mutationFn: () => rerun({ data: { itemId } }), onSuccess: invalidate });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/orders">
            <ArrowLeft className="size-4" /> Back to orders
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={rerunMutation.isPending} onClick={() => rerunMutation.mutate()}>
            <RefreshCw className="size-4" /> Rerun screening
          </Button>
          <Button size="sm" disabled={releaseMutation.isPending} onClick={() => releaseMutation.mutate()}>
            <Send className="size-4" /> Release to client
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <p className="flex items-center gap-2 rounded-xl border bg-card p-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading screening…
        </p>
      ) : query.isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "Snapshot not available."}
        </p>
      ) : query.data?.snapshot ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Order {query.data.meta.reference} · {query.data.meta.customer ?? "—"} · status{" "}
            {query.data.meta.fulfilmentStatus}
          </p>
          <SanctionsSnapshotView
            snapshot={query.data.snapshot}
            meta={{ reference: query.data.meta.reference, productName: query.data.meta.productName }}
          />
        </>
      ) : (
        <p className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          No screening has been stored for this line yet. Use “Rerun screening”.
        </p>
      )}
    </div>
  );
}
