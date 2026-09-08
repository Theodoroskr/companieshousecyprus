import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listCompaniesByNameTerm } from "@/lib/companies.functions";
import { CompanyList } from "@/components/company-list";
import { CopyGuard } from "@/components/copy-guard";
import { companyCanonicalSlug } from "@/lib/slug";
import { findNameCluster, nameClusterPath, NAME_CLUSTERS } from "@/lib/seo/name-clusters";
import { setDirectoryPageCacheHeaders } from "@/lib/http-cache";

const SITE_URL = "https://companieshousecyprus.com";

const clusterQueryOptions = (term: string) =>
  queryOptions({
    queryKey: ["name-cluster", term],
    queryFn: () => listCompaniesByNameTerm({ data: { term } }),
    staleTime: 30 * 60 * 1000,
  });

export const Route = createFileRoute("/name/$term")({
  loader: async ({ params, context }) => {
    const cluster = findNameCluster(params.term);
    if (!cluster) throw notFound();
    await context.queryClient.ensureQueryData(clusterQueryOptions(cluster.term));
    setDirectoryPageCacheHeaders();
    return { cluster };
  },
  head: ({ params, loaderData }) => {
    const cluster = loaderData?.cluster ?? findNameCluster(params.term);
    if (!cluster) {
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    }
    const url = `${SITE_URL}${nameClusterPath(cluster)}`;
    const title = `${cluster.label} — Cyprus companies register | Companies House Cyprus`;
    const description = `Cyprus registry entities named ${cluster.label}: registration number, incorporation date, status, registered office district and officers on record.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Cyprus company search", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: cluster.label, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: NameClusterPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Name not found</h1>
      <p className="mt-2 text-muted-foreground">
        Try the <Link to="/search" search={{ q: "", page: 1 }} className="underline">register search</Link> instead.
      </p>
    </div>
  ),
});

function NameClusterPage() {
  const { cluster } = Route.useLoaderData();
  const { data } = useSuspenseQuery(clusterQueryOptions(cluster.term));
  const active = data.rows.filter((row) => row.status_group === "active");

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-5xl px-4 py-8 md:py-12">
          <nav className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Cyprus company search</Link>
            <span>/</span>
            <span className="text-primary-foreground/90">{cluster.label}</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl md:text-4xl">
            {cluster.label} — Cyprus companies register
          </h1>
          <p className="mt-3 max-w-3xl text-primary-foreground/75">{cluster.intro}</p>
          <p className="mt-2 text-sm text-primary-foreground/60">
            {data.count} matching {data.count === 1 ? "entity" : "entities"} · {active.length} currently registered
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8 md:py-10">
        <CopyGuard>
          <CompanyList rows={data.rows} emptyLabel={`No registry entity named ${cluster.label} was found.`} />
        </CopyGuard>

        {data.rows.length > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "ItemList",
                name: `Cyprus registry entities named ${cluster.label}`,
                numberOfItems: data.rows.length,
                itemListElement: data.rows.map((row, index) => ({
                  "@type": "ListItem",
                  position: index + 1,
                  name: row.name,
                  url: `${SITE_URL}/company/${companyCanonicalSlug(row)}`,
                })),
              }),
            }}
          />
        )}

        <section className="mt-10 rounded-xl border bg-card p-6 shadow-panel">
          <h2 className="font-display text-xl font-semibold">What each profile shows</h2>
          <p className="mt-2 text-muted-foreground">
            Open any entity above for its registration number, incorporation date, registry status and status date,
            registered office address, entity type and the officers on record. Certified certificates and company
            profile reports can be ordered from the same page and are issued from the Registrar of Companies.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/search" search={{ q: "", page: 1 }} className="underline">Search the full register</Link>
            <Link to="/pricing" className="underline">Certificates and reports</Link>
            <Link to="/cyprus-companies-registry" className="underline">About the Cyprus registry</Link>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-base font-semibold">Other frequently searched names</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {NAME_CLUSTERS.filter((other) => other.term !== cluster.term).map((other) => (
              <Link
                key={other.term}
                to="/name/$term"
                params={{ term: other.term }}
                className="rounded-full border bg-muted px-3 py-1 text-sm text-muted-foreground hover:bg-muted/70"
              >
                {other.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
