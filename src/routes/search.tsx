import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { searchCompanies, type CompanyListItem } from "@/lib/companies.functions";
import { displayOfficialNo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { PRODUCTS_BY_SLUG, formatPrice } from "@/lib/products";

const TYPE_OPTIONS = [
  { code: "C", label: "Company" },
  { code: "B", label: "Business Name" },
  { code: "P", label: "Partnership" },
  { code: "O", label: "Overseas Company" },
  { code: "N", label: "Partnership (BN)" },
] as const;

const STATUS_OPTIONS = [
  { code: "active", label: "Active" },
  { code: "at_risk", label: "At risk" },
  { code: "struck_off", label: "Struck off" },
  { code: "dissolved", label: "Dissolved" },
  { code: "liquidation", label: "Liquidation" },
] as const;

const parseList = (value: unknown, allowed: readonly string[]): string[] =>
  typeof value === "string"
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => allowed.includes(v))
    : [];

const searchQueryOptions = (q: string, page: number, types: string[], statuses: string[]) =>
  queryOptions({
    queryKey: ["search", q, page, types.join(","), statuses.join(",")],
    queryFn: () =>
      q.trim()
        ? searchCompanies({ data: { q, page, types, statuses } })
        : Promise.resolve({ rows: [] as CompanyListItem[], count: 0, capped: false }),
  });

export const Route = createFileRoute("/search")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { q: string; page: number; product?: string; type?: string; status?: string } => {
    const types = parseList(search["type"], TYPE_OPTIONS.map((t) => t.code));
    const statuses = parseList(search["status"], STATUS_OPTIONS.map((s) => s.code));
    return {
      q: typeof search["q"] === "string" ? (search["q"] as string) : "",
      page: Number(search["page"]) > 0 ? Number(search["page"]) : 1,
      ...(typeof search["product"] === "string" ? { product: search["product"] as string } : {}),
      ...(types.length > 0 ? { type: types.join(",") } : {}),
      ...(statuses.length > 0 ? { status: statuses.join(",") } : {}),
    };
  },
  loaderDeps: ({ search }) => ({
    q: search.q,
    page: search.page,
    type: search.type ?? "",
    status: search.status ?? "",
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      searchQueryOptions(
        deps.q,
        deps.page,
        deps.type ? deps.type.split(",") : [],
        deps.status ? deps.status.split(",") : [],
      ),
    );
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
  const { q, page, product: productSlug, type, status } = Route.useSearch();
  const navigate = Route.useNavigate();
  const types = type ? type.split(",") : [];
  const statuses = status ? status.split(",") : [];

  const setSearch = (next: { q?: string; page?: number; types?: string[]; statuses?: string[] }) => {
    const nextTypes = next.types ?? types;
    const nextStatuses = next.statuses ?? statuses;
    navigate({
      search: {
        q: next.q ?? q,
        page: next.page ?? 1,
        ...(productSlug ? { product: productSlug } : {}),
        ...(nextTypes.length > 0 ? { type: nextTypes.join(",") } : {}),
        ...(nextStatuses.length > 0 ? { status: nextStatuses.join(",") } : {}),
      },
    });
  };

  const toggle = (list: string[], code: string) =>
    list.includes(code) ? list.filter((v) => v !== code) : [...list, code];

  const pendingProduct = productSlug ? PRODUCTS_BY_SLUG[productSlug] : undefined;
  const { data } = useSuspenseQuery(searchQueryOptions(q, page, types, statuses));
  const totalPages = Math.ceil(data.count / 50);

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h1 className="text-3xl font-bold md:text-4xl">Search the Cyprus register</h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/75">
            Free search across the full register — by company name or HE / registration number.
          </p>
          <form
            className="mt-8 flex max-w-2xl flex-col gap-2 rounded-xl border border-white/15 bg-white/10 p-2 backdrop-blur sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              const value = String(new FormData(e.currentTarget).get("q") ?? "");
              setSearch({ q: value, page: 1 });
            }}
          >
            <input
              key={q}
              name="q"
              type="search"
              placeholder="Company name or HE number…"
              defaultValue={q}
              className="h-11 flex-1 rounded-lg bg-transparent px-3 text-primary-foreground placeholder:text-primary-foreground/50 outline-none"
            />
            <Button type="submit" className="h-11 bg-copper px-6 text-copper-foreground hover:bg-copper/90">
              Search
            </Button>
          </form>
          {pendingProduct && (
            <p className="mt-4 max-w-2xl rounded-lg border border-copper/40 bg-copper/10 px-4 py-3 text-sm text-primary-foreground/90">
              Ordering <strong className="text-copper">{pendingProduct.name}</strong> ({formatPrice(pendingProduct.price)}) — pick the company below and we'll add it to your cart.
            </p>
          )}
        </div>
      </section>

      {q ? (
        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="rounded-xl border bg-card p-4 shadow-panel">
            <div className="flex flex-col gap-4 md:flex-row md:gap-8">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entity type</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TYPE_OPTIONS.map((option) => {
                    const on = types.includes(option.code);
                    return (
                      <button
                        key={option.code}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSearch({ page: 1, types: toggle(types, option.code) })}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          on
                            ? "border-copper bg-copper text-copper-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registry status</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((option) => {
                    const on = statuses.includes(option.code);
                    return (
                      <button
                        key={option.code}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSearch({ page: 1, statuses: toggle(statuses, option.code) })}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          on
                            ? "border-copper bg-copper text-copper-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {(types.length > 0 || statuses.length > 0) && (
              <button
                type="button"
                onClick={() => setSearch({ page: 1, types: [], statuses: [] })}
                className="mt-4 text-xs font-medium text-copper underline-offset-4 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          <p className="mt-5 text-sm text-muted-foreground">
            {data.count.toLocaleString()}
            {data.capped ? "+" : ""} {data.count === 1 ? "result" : "results"}
            {data.capped ? " — refine your search to narrow this down" : ""}
            {q ? ` for “${q}”` : ""}
            {types.length + statuses.length > 0 ? " (filtered)" : ""}
          </p>


          <ul className="mt-5 divide-y overflow-hidden rounded-xl border bg-card shadow-panel">
            {data.rows.length === 0 && (
              <li className="p-10 text-center text-muted-foreground">
                No companies matched. Try a shorter name or the HE number.
              </li>
            )}
            {data.rows.map((company) => (
              <li key={company.slug} className="transition-colors hover:bg-muted/50">
                <Link
                  to="/company/$slug"
                  params={{ slug: company.slug }}
                  search={pendingProduct ? { product: pendingProduct.slug } : {}}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <span>
                    <span className="block font-medium">{company.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {displayOfficialNo(company)}
                      {company.district_en && ` · ${company.district_en}`}
                    </span>
                  </span>
                  {company.status_en && (
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        company.status_group === "active"
                          ? "border-olive/30 bg-olive/10 text-olive"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {company.status_en}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <Button variant="outline" disabled={page <= 1} onClick={() => setSearch({ page: page - 1 })}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages.toLocaleString()}
              </span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setSearch({ page: page + 1 })}>
                Next
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-16 text-center">
          <p className="text-lg font-medium text-foreground">Start your search</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Enter a company name or HE / registration number above to find the entity you need.
          </p>
        </div>
      )}
    </div>
  );
}

