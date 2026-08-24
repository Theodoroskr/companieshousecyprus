import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { myReport } from "@/lib/orders.functions";
import { ReportView } from "@/components/report/ReportView";
import { Button } from "@/components/ui/button";

const TITLE = "Your report — Companies House Cyprus";
const DESCRIPTION = "View and print the Cyprus company profile or credit report delivered with your order.";

export const Route = createFileRoute("/_authenticated/account/reports/$itemId")({
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
  component: ClientReportPage,
});

function ClientReportPage() {
  const { itemId } = Route.useParams();
  const load = useServerFn(myReport);
  const query = useQuery({ queryKey: ["my-report", itemId], queryFn: () => load({ data: { itemId } }) });

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
          <Loader2 className="size-4 animate-spin" /> Loading your report…
        </p>
      ) : query.isError ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          {query.error instanceof Error ? query.error.message : "This report is not available yet."}
        </p>
      ) : query.data ? (
        <ReportView report={query.data.report} meta={query.data.meta} />
      ) : null}
    </div>
  );
}
