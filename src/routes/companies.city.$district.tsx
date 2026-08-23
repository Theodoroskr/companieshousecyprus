import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCompaniesByDistrict } from "@/lib/companies.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

const districtQueryOptions = (district: string, page: number) =>
  queryOptions({
    queryKey: ["district", district, page],
    queryFn: () => listCompaniesByDistrict({ data: { district, page } }),
  });

export const Route = createFileRoute("/companies/city/$district")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(districtQueryOptions(params.district, 1));
  },
  head: ({ params }) => ({
    meta: [
      { title: `Companies in ${params.district} | Companies House Cyprus` },
      { name: "description", content: `Browse Cyprus companies registered in ${params.district}.` },
      { property: "og:title", content: `Companies in ${params.district} | Companies House Cyprus` },
      { property: "og:description", content: `Browse Cyprus companies registered in ${params.district}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DistrictPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">District not found</h1>
      <p className="mt-2 text-muted-foreground">We could not find that district.</p>
    </div>
  ),
});

function DistrictPage() {
  const { district } = Route.useParams();
  const [page, setPage] = useState(1);
  const { data } = useSuspenseQuery(districtQueryOptions(district, page));
  const totalPages = Math.ceil(data.count / 50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Companies in {district}</h1>
      <p className="mt-2 text-muted-foreground">{data.count.toLocaleString()} companies</p>

      <ul className="mt-6 divide-y rounded-lg border bg-card">
        {data.rows.length === 0 && (
          <li className="p-6 text-center text-muted-foreground">No companies found.</li>
        )}
        {data.rows.map((company) => (
          <li key={company.slug} className="p-4 hover:bg-muted/50">
            <Link to="/company/$slug" params={{ slug: company.slug }} className="block">
              <p className="font-medium text-foreground">{company.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {company.official_no}
                {company.status_en && ` • ${company.status_en}`}
                {company.locality && ` • ${company.locality}`}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
