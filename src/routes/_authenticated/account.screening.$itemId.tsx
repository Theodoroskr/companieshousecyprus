import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { mySnapshot } from "@/lib/orders.functions";
import { SanctionsSnapshotView } from "@/components/report/SanctionsSnapshotView";
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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/account/orders">
            <ArrowLeft className="size-4" /> Back to my orders
          </Link>
        </Button>
        {query.data ? (
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Save as PDF
          </Button>
        ) : null}
      </div>

      {query.isLoading ? (
        <p className="flex items-center gap-2 rounded-xl border bg-card p-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your screening…
        </p>
      ) : query.isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "This screening is not available yet."}
        </p>
      ) : query.data ? (
        <SanctionsSnapshotView snapshot={query.data.snapshot} meta={query.data.meta} />
      ) : null}
    </div>
  );
}
