import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { resolveDistrict } from "@/lib/districts";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCompaniesByDistrict } from "@/lib/companies.functions";
import { displayOfficialNo } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { companyCanonicalSlug } from "@/lib/slug";
import { setDirectoryPageCacheHeaders } from "@/lib/http-cache";

const districtQueryOptions = (district: string, page: number) =>
  queryOptions({
    queryKey: ["district", district, page],
    queryFn: () => listCompaniesByDistrict({ data: { district, page } }),
  });

export const Route = createFileRoute("/companies/city/$district")({
  loader: async ({ params, context }) => {
    const resolved = resolveDistrict(params.district);
    if (resolved.kind === "redirect") {
      throw redirect({
        to: "/companies/city/$district",
        params: { district: resolved.slug },
        statusCode: 301,
        replace: true,
      });
    }
    // Unknown district: a real 404, never an indexable "0 entities" page (Soft 404).
    if (resolved.kind === "unknown") throw notFound();
    const data = await context.queryClient.ensureQueryData(districtQueryOptions(resolved.district.slug, 1));
    if (data.count === 0) throw notFound();
    setDirectoryPageCacheHeaders();
    return { name: resolved.district.name };
  },

  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "District not found | Companies House Cyprus" }, { name: "robots", content: "noindex" }] };
    }
    const name = loaderData.name;
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
        { property: "og:url", content: `https://companieshousecyprus.com/companies/city/${params.district.toLowerCase()}` },
      ],
      links: [{ rel: "canonical", href: `https://companieshousecyprus.com/companies/city/${params.district.toLowerCase()}` }],
    };
  },
  component: DistrictPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">District not found</h1>
      <p className="mt-2 text-muted-foreground">
        We could not find that district.{" "}
        <Link to="/search" search={{ q: "", page: 1 }} className="underline">
          Search the register
        </Link>
        .
      </p>
    </div>
  ),
  errorComponent: () => (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">This list is temporarily unavailable</h1>
      <p className="mt-2 text-muted-foreground">Please try again in a moment.</p>
    </div>
  ),
});

function DistrictPage() {
  const { district } = Route.useParams();
  const { name } = Route.useLoaderData();
  const [page, setPage] = useState(1);
  const { data } = useSuspenseQuery(districtQueryOptions(district, page));
  const totalPages = Math.ceil(data.count / 50);

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <nav className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Cyprus company search</Link>
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
                params={{ slug: companyCanonicalSlug(company) }}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <span>
                  <span className="block font-medium">{company.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {displayOfficialNo(company)}
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

