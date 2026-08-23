import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listCompaniesByLetter } from "@/lib/companies.functions";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

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
  },
  head: ({ params }) => ({
    meta: [
      { title: `Companies starting with ${params.letter.toUpperCase()} | Companies House Cyprus` },
      { name: "description", content: `Browse Cyprus companies starting with ${params.letter.toUpperCase()}.` },
      { property: "og:title", content: `Companies starting with ${params.letter.toUpperCase()} | Companies House Cyprus` },
      { property: "og:description", content: `Browse Cyprus companies starting with ${params.letter.toUpperCase()}.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
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
        <div className="mx-auto max-w-7xl px-4 py-12">
          <nav className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Home</Link>
            <span>/</span>
            <span className="text-primary-foreground/90">A–Z · {letter.toUpperCase()}</span>
          </nav>
          <h1 className="mt-5 text-3xl font-bold md:text-4xl">
            Cyprus companies starting with {letter.toUpperCase()}
          </h1>
          <p className="mt-3 text-primary-foreground/75">{data.count.toLocaleString()} entities on the register.</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        <AlphabetNav />

        <ul className="mt-8 divide-y overflow-hidden rounded-xl border bg-card shadow-panel">
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
                    {company.district_en && ` · ${company.district_en}`}
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


function AlphabetNav() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const { letter } = Route.useParams();
  return (
    <div className="flex flex-wrap gap-1.5">
      {letters.map((l) => (
        <Link
          key={l}
          to="/companies/a-z/$letter"
          params={{ letter: l.toLowerCase() }}
          className={`rounded px-2 py-1 text-sm font-medium ${
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
