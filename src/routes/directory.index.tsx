import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getDirectoryOverview } from "@/lib/directory.functions";
import { DIRECTORY_GROUP_LABELS, type DirectorySignal } from "@/lib/directory-signals";
import { ShieldAlert } from "lucide-react";

const SITE_URL = "https://companieshousecyprus.com";

const overviewQueryOptions = () =>
  queryOptions({
    queryKey: ["directory", "overview"],
    queryFn: () => getDirectoryOverview(),
  });

const TITLE = "Directory of Cyprus companies by risk signal | Companies House Cyprus";
const DESCRIPTION =
  "Browse Cyprus companies by registry signal — liquidation, administration, strike-off, dissolved and active entities — sourced from the Department of Registrar of Companies.";

export const Route = createFileRoute("/directory/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(overviewQueryOptions());
    if (import.meta.env.SSR) {
      const { setDirectoryPageCacheHeaders } = await import("@/lib/http-cache.server");
      setDirectoryPageCacheHeaders();
    }
  },

  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/directory` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/directory` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Directory", item: `${SITE_URL}/directory` },
          ],
        }),
      },
    ],
  }),
  component: DirectoryIndex,
});

function DirectoryIndex() {
  const { data } = useSuspenseQuery(overviewQueryOptions());
  const groups: DirectorySignal["group"][] = ["insolvency", "strike_off", "lifecycle"];

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <nav className="flex items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Home</Link>
            <span>/</span>
            <span className="text-primary-foreground/90">Directory</span>
          </nav>
          <h1 className="mt-5 text-3xl font-bold md:text-4xl">Directory</h1>
          <p className="mt-3 max-w-3xl text-primary-foreground/75">
            Browse the Cyprus register by signal. Each section lists the companies carrying that
            signal in their public registry record, sourced from the Department of Registrar of
            Companies and Intellectual Property.
          </p>
          {data.refreshedAt && (
            <p className="mt-2 text-xs text-primary-foreground/60">
              Counts refreshed {new Date(data.refreshedAt).toLocaleString("en-GB")}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {groups.map((group) => {
          const signals = data.signals.filter((signal) => signal.group === group);
          if (signals.length === 0) return null;
          return (
            <section key={group} className="mb-10">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-copper">
                {DIRECTORY_GROUP_LABELS[group]}
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {signals.map((signal) => (
                  <Link
                    key={signal.slug}
                    to="/directory/$signal"
                    params={{ signal: signal.slug }}
                    search={{ page: 1 }}
                    className="rounded-xl border bg-card p-5 shadow-panel transition-colors hover:border-copper/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold leading-tight">{signal.title}</h3>
                      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                        {signal.count.toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{signal.summary}</p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-xl border bg-card p-6 shadow-panel">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-copper" />
            <div>
              <h2 className="font-semibold">
                Entities on official sanctions lists
                {data.sanctionedEntityCount !== null && (
                  <span className="ml-2 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                    {data.sanctionedEntityCount.toLocaleString()}
                  </span>
                )}
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                We maintain a live copy of the legal-entity records published on the EU Consolidated
                Financial Sanctions List, the UN Security Council Consolidated List, the UK Sanctions
                List (OFSI) and the US OFAC SDN List. These records are not linked to Cyprus
                registration numbers by the publishing authorities, so this section does not list
                Cyprus companies. To check a specific company against all four sources, order a
                Sanctions Risk Snapshot.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <Link
                  to="/report/$type"
                  params={{ type: "sanctions-risk-snapshot" }}
                  className="rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground"
                >
                  Sanctions Risk Snapshot
                </Link>
                <Link
                  to="/search"
                  search={{ q: "", page: 1 }}
                  className="rounded-md border px-3 py-2 font-medium"
                >
                  Search the register
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
