import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { searchCompanies } from "@/lib/companies.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const searchQueryOptions = (q: string, page: number) =>
  queryOptions({
    queryKey: ["search", q, page],
    queryFn: () => searchCompanies({ data: { q, page } }),
  });

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? (search["q"] as string) : "",
    page: Number(search["page"]) > 0 ? Number(search["page"]) : 1,
  }),
  loaderDeps: ({ search }) => ({ q: search.q, page: search.page }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(searchQueryOptions(deps.q, deps.page));
  },
  head: () => ({
    meta: [
      { title: "Search Cyprus Companies | Companies House Cyprus" },
      { name: "description", content: "Search the Cyprus Registrar of Companies directory by company name or registration number." },
      { property: "og:title", content: "Search Cyprus Companies | Companies House Cyprus" },
      { property: "og:description", content: "Search the Cyprus Registrar of Companies directory by company name or registration number." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setSearch = (nextQ: string, nextPage: number) =>
    navigate({ search: { q: nextQ, page: nextPage } });
  const { data } = useSuspenseQuery(searchQueryOptions(q, page));
  const totalPages = Math.ceil(data.count / 50);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight">Search companies</h1>
      <p className="mt-2 text-muted-foreground">Find Cyprus companies by name or registration number.</p>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("q") ?? "");
          setSearch(value, 1);
        }}
      >
        <Input
          key={q}
          name="q"
          type="search"
          placeholder="Company name or HE number..."
          defaultValue={q}
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      <p className="mt-4 text-sm text-muted-foreground">{data.count.toLocaleString()} results</p>

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
          <Button variant="outline" disabled={page <= 1} onClick={() => setSearch(q, page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages} onClick={() => setSearch(q, page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
