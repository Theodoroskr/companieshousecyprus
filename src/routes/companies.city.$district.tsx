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
  head: ({ params }) => {
    const name = params.district.charAt(0).toUpperCase() + params.district.slice(1);
    const title = `Companies registered in ${name}, Cyprus | Companies House Cyprus`;
    const description = `Browse Cyprus companies with a registered office in the ${name} district — status, registration number and full profiles.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
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
  const name = district.charAt(0).toUpperCase() + district.slice(1);

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <nav className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Home</Link>
            <span>/</span>
            <span className="text-primary-foreground/90">{name}</span>
          </nav>
          <h1 className="mt-5 text-3xl font-bold md:text-4xl">Companies in {name}</h1>
          <p className="mt-3 text-primary-foreground/75">
            {data.count.toLocaleString()} entities with a registered office in the {name} district.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-panel">
          {data.rows.length === 0 && (
            <li className="p-10 text-center text-muted-foreground">No companies found.</li>
          )}
          {data.rows.map((company) => (
            <li key={company.slug} className="transition-colors hover:bg-muted/50">
              <Link
                to="/company/$slug"
                params={{ slug: company.slug }}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span>
                  <span className="block font-medium">{company.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {company.official_no}
                    {company.locality && ` · ${company.locality}`}
                  </span>
                </span>
                {company.status_en && (
                  <span className="rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {company.status_en}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages.toLocaleString()}
            </span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

