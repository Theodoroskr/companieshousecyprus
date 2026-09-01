import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCompaniesByLetter } from "@/lib/companies.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CopyGuard } from "@/components/copy-guard";
import { CompanyList } from "@/components/company-list";
import { setDirectoryPageCacheHeaders } from "@/lib/http-cache";

const letterQueryOptions = (letter: string, page: number) =>
  queryOptions({
    queryKey: ["letter", letter, page],
    queryFn: () => listCompaniesByLetter({ data: { letter, page } }),
  });

export const Route = createFileRoute("/companies/a-z/$letter")({
  loader: async ({ params, context }) => {
    const letter = params.letter.toUpperCase();
    if (!/^[A-Z]$/.test(letter)) throw notFound();
    await context.queryClient.ensureQueryData(letterQueryOptions(letter, 1));
    setDirectoryPageCacheHeaders();
  },
  head: ({ params }) => ({
    meta: [
      { title: `Companies starting with ${params.letter.toUpperCase()} | Companies House Cyprus` },
      { name: "description", content: `Browse Cyprus companies starting with ${params.letter.toUpperCase()}.` },
      { property: "og:title", content: `Companies starting with ${params.letter.toUpperCase()} | Companies House Cyprus` },
      { property: "og:description", content: `Browse Cyprus companies starting with ${params.letter.toUpperCase()}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: `/companies/a-z/${params.letter.toLowerCase()}` },
    ],
    links: [{ rel: "canonical", href: `/companies/a-z/${params.letter.toLowerCase()}` }],
  }),
  component: LetterPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Invalid letter</h1>
      <p className="mt-2 text-muted-foreground">Please choose a letter from A to Z.</p>
    </div>
  ),
});

function LetterPage() {
  const { letter } = Route.useParams();
  const [page, setPage] = useState(1);
  const { data } = useSuspenseQuery(letterQueryOptions(letter, page));
  const totalPages = Math.ceil(data.count / 50);

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-8 md:py-12">
          <nav className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Cyprus company search</Link>
            <span>/</span>
            <span className="text-primary-foreground/90">A–Z · {letter.toUpperCase()}</span>
          </nav>
          <h1 className="mt-4 text-2xl font-bold sm:text-3xl md:text-4xl">
            Cyprus companies starting with {letter.toUpperCase()}
          </h1>
          <p className="mt-3 text-primary-foreground/75">{data.count.toLocaleString()} entities on the register.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <AlphabetNav />

        <CopyGuard>
          <div className="mt-6 md:mt-8">
            <CompanyList rows={data.rows} />
          </div>
        </CopyGuard>
        <p className="mt-3 text-xs text-muted-foreground">
          Index data is provided for individual look-ups only. Systematic copying, scraping or
          redistribution of the register index is not permitted.
        </p>

        {totalPages > 1 && (
          <div className="mt-8 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <span className="text-center text-sm text-muted-foreground">
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


function AlphabetNav() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const { letter } = Route.useParams();
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {letters.map((l) => (
        <Link
          key={l}
          to="/companies/a-z/$letter"
          params={{ letter: l.toLowerCase() }}
          className={`shrink-0 rounded px-2.5 py-1.5 text-sm font-medium ${
            l === letter.toUpperCase()
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {l}
        </Link>
      ))}
    </div>
  );
}
