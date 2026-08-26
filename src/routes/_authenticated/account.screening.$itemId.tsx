import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { mySnapshot } from "@/lib/orders.functions";
import { SanctionsSnapshotView } from "@/components/report/SanctionsSnapshotView";
import { SnapshotReportShell } from "@/components/report/SnapshotReportShell";
import { Button } from "@/components/ui/button";

const TITLE = "Your sanctions screening — Companies House Cyprus";
const DESCRIPTION =
  "View and print your Sanctions Risk Snapshot: entity-only screening of a Cyprus company against official EU, UN, UK and US sources.";

export const Route = createFileRoute("/_authenticated/account/screening/$itemId")({
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
  component: ClientSnapshotPage,
});

function ClientSnapshotPage() {
  const { itemId } = Route.useParams();
  const load = useServerFn(mySnapshot);
  const query = useQuery({ queryKey: ["my-snapshot", itemId], queryFn: () => load({ data: { itemId } }) });

  return (
    <SnapshotReportShell
      backTo="/account/orders"
      backLabel="Back to my orders"
      loadingLabel="Loading your screening…"
      isLoading={query.isLoading}
      error={
        query.isError
          ? query.error instanceof Error
            ? query.error.message
            : "This screening is not available yet."
          : null
      }
      actions={
        query.data ? (
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Save as PDF
          </Button>
        ) : null
      }
    >
      {query.data ? <SanctionsSnapshotView snapshot={query.data.snapshot} meta={query.data.meta} /> : null}
    </SnapshotReportShell>
  );
}
