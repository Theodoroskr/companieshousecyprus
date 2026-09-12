import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowRight, CalendarDays, FileText, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getRegistryFilingsForDate,
  getRegistryFilingsOverview,
  type FilingEntry,
} from "@/lib/registry-filings.functions";

const TITLE = "Cyprus Corporate Registry — Free Cyprus Company Register Search";
const DESCRIPTION =
  "Search the Cyprus corporate registry free — no account needed. The Cyprus company register with daily filings: new incorporations and status changes recorded by the Registrar of Companies.";
const CANONICAL = "https://companieshousecyprus.com/cyprus-corporate-registry";

const FAQS = [
  {
    q: "What is the Cyprus corporate registry?",
    a: "The official register of companies and other legal entities in Cyprus, maintained by the Department of Registrar of Companies and Intellectual Property. It records every incorporated company, partnership, overseas company and business name, together with its registration number, status, registered office and filing history.",
  },
  {
    q: "Is searching the Cyprus corporate registry free?",
    a: "Yes. Searching by company name or HE number and viewing company profiles on this site is completely free and requires no account. Fees apply only when you order official Registrar certificates, structure reports or credit reports.",
  },
  {
    q: "What can I find with a registry search?",
    a: "A company profile shows the registered name, HE registration number, incorporation date, current registry status (registered, struck off, dissolved and so on), entity type and registered office district, plus the filing activity recorded for the entity.",
  },
  {
    q: "Can I search in Greek as well as English?",
    a: "Yes. The register matches names in both the Greek and Latin scripts, including transliterations, so you can search with the Greek spelling of a company name and still reach its profile.",
  },
  {
    q: "What are the filings shown on this page?",
    a: "Two kinds of registry activity per day: new registrations (entities newly entered on the register) and status changes (entities whose registry status was updated on that date). The data reflects the Registrar's published records up to the latest available update.",
  },
  {
    q: "How current is the registry data?",
    a: "Data is refreshed from the Registrar's published records on a regular cycle. The latest date covered is shown next to the filings totals on this page. Very recent incorporations may appear after a short delay while the official monthly export is processed.",
  },
  {
    q: "Why are officer names not shown publicly?",
    a: "Director, secretary and shareholder details are personal data. In line with GDPR we do not publish them openly in search results; they are disclosed only inside purchased official reports, where there is a legitimate basis for processing.",
  },
  {
    q: "Is this the official government registry website?",
    a: "No. Companies House Cyprus is an independent commercial service operated by Infocredit Group Ltd. We republish the Registrar's official open data for free searching and order official certificates and reports on your behalf. The official authority is the Department of Registrar of Companies and Intellectual Property.",
  },
  {
    q: "How do I get official documents for a company I find here?",
    a: "Open the company profile and choose the certificate or report you need — for example a certificate of good standing, certificate of directors and secretary, or a structure report. Documents are ordered online and delivered digitally once issued.",
  },
];

const searchSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Route = createFileRoute("/cyprus-corporate-registry")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ date: search.date }),
  loader: async ({ deps }) => {
    const overview = await getRegistryFilingsOverview();
    const date = deps.date ?? overview.days[0]?.date ?? overview.latestDate ?? null;
    const day = date ? await getRegistryFilingsForDate({ data: { date } }) : null;
    return { overview, day };
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://companieshousecyprus.com/" },
            { "@type": "ListItem", position: 2, name: "Cyprus corporate registry", item: CANONICAL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Cyprus Corporate Registry",
          description: DESCRIPTION,
          url: CANONICAL,
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Companies House Cyprus",
          url: "https://companieshousecyprus.com/",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://companieshousecyprus.com/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  }),
  component: CorporateRegistryPage,
});

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function FilingList({ entries, empty }: { entries: FilingEntry[]; empty: string }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link
            to="/company/$slug"
            params={{ slug: entry.slug }}
            className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="font-medium">{entry.name}</span>
            <span className="text-xs text-muted-foreground">
              {[entry.officialNo, entry.typeEn, entry.statusEn, entry.district]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CorporateRegistryPage() {
  const { overview, day } = Route.useLoaderData();
  const navigate = useNavigate();
  const [term, setTerm] = useState("");

  const activeDate = day?.date ?? null;

  return (
    <main>
      <section className="surface-deep">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span aria-current="page">Cyprus corporate registry</span>
          </nav>
          <h1 className="mt-4 text-3xl sm:text-4xl">Cyprus corporate registry</h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">
            Search every entity on the Cyprus register free of charge, and follow registry filings
            day by day — new incorporations and status changes as recorded by the Department of
            Registrar of Companies and Intellectual Property.
          </p>

          <form
            className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const q = term.trim();
              if (!q) return;
              void navigate({ to: "/search", search: { q, page: 1 } });
            }}
          >
            <label className="sr-only" htmlFor="registry-search">
              Search company name or registration number
            </label>
            <input
              id="registry-search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Company name or HE number"
              className="h-11 flex-1 rounded-md border border-input bg-background px-4 text-sm"
            />
            <Button type="submit" className="h-11">
              <Search className="mr-2 h-4 w-4" aria-hidden="true" />
              Search registry
            </Button>
          </form>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-12 px-4 py-12">
        <section>
          <h2 className="font-heading text-2xl">Registry filings</h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Filing activity across the most recent period published by the Registrar
            {overview.latestDate ? `, up to ${formatDate(overview.latestDate)}` : ""}. Registrations
            are entities newly entered on the register; status changes are entities whose registry
            status was updated on that date.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-card p-4">
              <FileText className="h-5 w-5 text-copper" aria-hidden="true" />
              <p className="mt-2 text-2xl font-semibold">
                {overview.totalRegistrations.toLocaleString("en-GB")}
              </p>
              <p className="text-sm text-muted-foreground">New registrations in the period</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <ShieldCheck className="h-5 w-5 text-copper" aria-hidden="true" />
              <p className="mt-2 text-2xl font-semibold">
                {overview.totalStatusChanges.toLocaleString("en-GB")}
              </p>
              <p className="text-sm text-muted-foreground">Status changes in the period</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <CalendarDays className="h-5 w-5 text-copper" aria-hidden="true" />
              <p className="mt-2 text-2xl font-semibold">{overview.days.length}</p>
              <p className="text-sm text-muted-foreground">Days with recorded filings</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-heading text-2xl">Filings by date</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a date to see the entities filed on that day.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {overview.days.slice(0, 30).map((entry) => {
              const active = entry.date === activeDate;
              return (
                <Link
                  key={entry.date}
                  to="/cyprus-corporate-registry"
                  search={{ date: entry.date }}
                  className={`rounded-md border px-3 py-2 text-xs transition-colors ${
                    active
                      ? "border-copper bg-copper/10 font-medium"
                      : "bg-card hover:bg-muted/60"
                  }`}
                >
                  <span className="block">{formatDate(entry.date)}</span>
                  <span className="block text-muted-foreground">
                    {entry.registrations + entry.statusChanges} filings
                  </span>
                </Link>
              );
            })}
          </div>

          {day ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <div>
                <h3 className="font-heading text-lg">
                  Registered on {formatDate(day.date)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({day.registrationCount.toLocaleString("en-GB")})
                  </span>
                </h3>
                <div className="mt-3">
                  <FilingList
                    entries={day.registrations}
                    empty="No new registrations recorded on this date."
                  />
                </div>
              </div>
              <div>
                <h3 className="font-heading text-lg">
                  Status changes on {formatDate(day.date)}{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({day.statusChangeCount.toLocaleString("en-GB")})
                  </span>
                </h3>
                <div className="mt-3">
                  <FilingList
                    entries={day.statusChanges}
                    empty="No status changes recorded on this date."
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">
              Filing data is being refreshed — please check back shortly.
            </p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Lists show up to 60 entities per date. Use the search above to find any other entity.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-heading text-2xl">Official documents and reports</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Registry search and company profiles are free. Registrar certificates, structure reports
            and credit reports are ordered online and delivered digitally.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/pricing">
                See products and pricing
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/cyprus-companies-registry">About the Cyprus register</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/statistics">Registry statistics</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
