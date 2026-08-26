import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Send } from "lucide-react";
import { adminReleaseReport, adminReviewSnapshot, adminRerunSnapshot } from "@/lib/orders.functions";
import { SanctionsSnapshotView } from "@/components/report/SanctionsSnapshotView";
import { SnapshotReportShell } from "@/components/report/SnapshotReportShell";
import { ScreeningStatusBadge } from "@/components/screening/ScreeningStatus";
import { statusForFulfilment } from "@/lib/sanctions/status-system";
import { Button } from "@/components/ui/button";

const TITLE = "Review sanctions screening — Companies House Cyprus";
const DESCRIPTION = "Analyst review of an entity-only Sanctions Risk Snapshot before release.";

export const Route = createFileRoute("/_authenticated/admin/screening-report/$itemId")({
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

  const snapshot = query.data?.snapshot;
  const meta = query.data?.meta;

  return (
    <SnapshotReportShell
      backTo="/admin/orders"
      backLabel="Back to orders"
      isLoading={query.isLoading}
      error={
        query.isError
          ? query.error instanceof Error
            ? query.error.message
            : "Snapshot not available."
          : null
      }
      actions={
        <>
          <Button variant="outline" size="sm" disabled={rerunMutation.isPending} onClick={() => rerunMutation.mutate()}>
            <RefreshCw className="size-4" /> Rerun screening
          </Button>
          <Button size="sm" disabled={releaseMutation.isPending} onClick={() => releaseMutation.mutate()}>
            <Send className="size-4" /> Release to client
          </Button>
        </>
      }
      subtitle={meta ? `Order ${meta.reference} · ${meta.customer ?? "—"}` : undefined}
      statusSlot={meta ? <ScreeningStatusBadge status={statusForFulfilment(meta.fulfilmentStatus)} /> : null}
      empty={
        <p className="rounded-xl border bg-card p-8 text-sm text-muted-foreground">
          No screening has been stored for this line yet. Use “Rerun screening”.
        </p>
      }
    >
      {snapshot && meta ? (
        <SanctionsSnapshotView
          snapshot={snapshot}
          meta={{ reference: meta.reference, productName: meta.productName }}
        />
      ) : null}
    </SnapshotReportShell>
  );
}
