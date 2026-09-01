import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listDirectorySignalCompanies } from "@/lib/directory.functions";
import {
  DIRECTORY_MAX_PAGE,
  DIRECTORY_PAGE_SIZE,
  getDirectorySignal,
} from "@/lib/directory-signals";
import { CopyGuard } from "@/components/copy-guard";
import { Button } from "@/components/ui/button";
import { CompanyList } from "@/components/company-list";
import { setDirectoryPageCacheHeaders } from "@/lib/http-cache";

const SITE_URL = "https://companieshousecyprus.com";
/** Beyond this depth pagination pages are thin duplicates — keep them out of the index. */
const INDEXABLE_PAGE_DEPTH = 5;

const signalQueryOptions = (signal: string, page: number) =>
  queryOptions({
    queryKey: ["directory", signal, page],
    queryFn: () => listDirectorySignalCompanies({ data: { signal, page } }),
  });

function clampPage(value: unknown): number {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.min(Math.floor(page), DIRECTORY_MAX_PAGE);
}

export const Route = createFileRoute("/directory/$signal")({
  validateSearch: (search: Record<string, unknown>) => ({ page: clampPage(search["page"] ?? 1) }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ params, deps, context }) => {
    if (!getDirectorySignal(params.signal)) throw notFound();
    await context.queryClient.ensureQueryData(signalQueryOptions(params.signal, deps.page));
    setDirectoryPageCacheHeaders();
  },

  head: ({ params, match }) => {
    const signal = getDirectorySignal(params.signal);
    if (!signal) {
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    }
    const page = clampPage((match.search as { page?: number } | undefined)?.page ?? 1);
    const suffix = page > 1 ? ` — page ${page}` : "";
    const title = `${signal.title}${suffix} | Companies House Cyprus`;
    const description = `${signal.summary} Browse the full list of Cyprus companies with this registry signal.`;
    const canonical =
      page > 1
        ? `${SITE_URL}/directory/${signal.slug}?page=${page}`
        : `${SITE_URL}/directory/${signal.slug}`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { name: "twitter:card", content: "summary" },
        ...(page > INDEXABLE_PAGE_DEPTH
          ? [{ name: "robots", content: "noindex,follow" }]
          : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: "Directory", item: `${SITE_URL}/directory` },
              {
                "@type": "ListItem",
                position: 3,
                name: signal.title,
                item: `${SITE_URL}/directory/${signal.slug}`,
              },
            ],
          }),
        },
      ],
    };
  },
  component: DirectorySignalPage,
  notFoundComponent: SignalNotFound,
});

function SignalNotFound() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Unknown directory section</h1>
      <p className="mt-2 text-muted-foreground">
        That directory section does not exist.{" "}
        <Link to="/directory" className="underline">
          Browse all sections
        </Link>
        .
      </p>
    </div>
  );
}

function DirectorySignalPage() {
  const { signal: slug } = Route.useParams();
  const { page } = Route.useSearch();
  const signal = getDirectorySignal(slug)!;
  const { data } = useSuspenseQuery(signalQueryOptions(slug, page));

  const totalPages = Math.min(
    DIRECTORY_MAX_PAGE,
    Math.max(1, Math.ceil(data.count / DIRECTORY_PAGE_SIZE)),
  );

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Cyprus company search</Link>
            <span>/</span>
            <Link to="/directory" className="hover:text-primary-foreground">Directory</Link>
            <span>/</span>
            <span className="text-primary-foreground/90">{signal.title}</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl md:text-4xl">{signal.title}</h1>
          <p className="mt-3 max-w-3xl text-primary-foreground/75">{signal.detail}</p>
          <p className="mt-3 text-sm text-primary-foreground/70">
            {data.count.toLocaleString()} companies
            {data.refreshedAt && ` · counts refreshed ${new Date(data.refreshedAt).toLocaleDateString("en-GB")}`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <CopyGuard>
          <CompanyList rows={data.rows} emptyLabel="No companies in this section." />
        </CopyGuard>
        <p className="mt-3 text-xs text-muted-foreground">
          Registry status data is provided for individual look-ups only. Systematic copying, scraping
          or redistribution of the register index is not permitted.
        </p>

        {totalPages > 1 && (
          <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button asChild variant="outline" disabled={page <= 1}>
              <Link to="/directory/$signal" params={{ signal: slug }} search={{ page: Math.max(1, page - 1) }}>
                Previous
              </Link>
            </Button>
            <span className="text-center text-sm text-muted-foreground">
              Page {page} of {totalPages.toLocaleString()}
            </span>
            <Button asChild variant="outline" disabled={page >= totalPages}>
              <Link
                to="/directory/$signal"
                params={{ signal: slug }}
                search={{ page: Math.min(totalPages, page + 1) }}
              >
                Next
              </Link>
            </Button>
          </div>
        )}

        <div className="mt-10 rounded-xl border bg-muted/40 p-5 text-sm text-muted-foreground">
          <Link to="/directory" className="font-medium text-foreground underline">
            All directory sections
          </Link>{" "}
          ·{" "}
          <Link to="/companies/a-z/$letter" params={{ letter: "a" }} className="underline">
            Browse A–Z
          </Link>{" "}
          ·{" "}
          <Link to="/search" search={{ q: "", page: 1 }} className="underline">
            Search the register
          </Link>
        </div>
      </div>
    </div>
  );
}
