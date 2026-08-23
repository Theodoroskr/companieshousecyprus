import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Companies starting with {letter.toUpperCase()}</h1>
      <p className="mt-2 text-muted-foreground">{data.count.toLocaleString()} companies</p>

      <AlphabetNav />

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
                {company.district_en && ` • ${company.district_en}`}
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

function AlphabetNav() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const { letter } = Route.useParams();
  return (
    <div className="mt-4 flex flex-wrap gap-1">
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
