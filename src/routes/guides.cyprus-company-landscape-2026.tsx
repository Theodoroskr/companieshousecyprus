import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Building2, Globe2, LineChart, MapPin, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE = "The Cyprus Company Landscape in 2026: What 571,218 Registered Entities Tell Us";
const DESCRIPTION =
  "A data-driven look at the Cyprus company register in 2026: 571,218 entities, one-third currently registered, where they are based, what they do, and why verification matters before you trade.";
const CANONICAL = "https://companieshousecyprus.com/guides/cyprus-company-landscape-2026";
const PUBLISHED = "2026-09-04";

export const Route = createFileRoute("/guides/cyprus-company-landscape-2026")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
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
          "@graph": [
            {
              "@type": "Article",
              "@id": `${CANONICAL}#article`,
              headline: TITLE,
              description: DESCRIPTION,
              datePublished: PUBLISHED,
              dateModified: PUBLISHED,
              inLanguage: "en",
              mainEntityOfPage: CANONICAL,
              author: { "@id": "https://companieshousecyprus.com/#organization" },
              publisher: { "@id": "https://companieshousecyprus.com/#organization" },
              about: {
                "@type": "Dataset",
                name: "Cyprus company register statistics",
                url: "https://companieshousecyprus.com/statistics",
              },
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://companieshousecyprus.com/" },
                { "@type": "ListItem", position: 2, name: "Guides", item: "https://companieshousecyprus.com/guides" },
                { "@type": "ListItem", position: 3, name: "Cyprus company landscape 2026", item: CANONICAL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: LandscapeArticle,
});

const SECTION_CLASS = "mx-auto max-w-3xl px-4";

function LandscapeArticle() {
  return (
    <main>
      <section className="surface-deep">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70">
            <Link to="/" className="hover:underline">Home</Link>
            <span className="mx-2">/</span>
            <Link to="/guides" className="hover:underline">Guides</Link>
            <span className="mx-2">/</span>
            <span aria-current="page">Cyprus company landscape 2026</span>
          </nav>
          <h1 className="mt-4 max-w-3xl text-3xl sm:text-4xl">
            The Cyprus company landscape in 2026: what 571,218 registered entities tell us
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80">
            An analysis of the full Cyprus register of companies — its size, composition, geography
            and activity patterns — based on the registry data published on this site.
          </p>
          <p className="mt-6 text-sm text-primary-foreground/60">
            By Companies House Cyprus (Infocredit Group Limited, HE4404) · Published 4 September 2026
          </p>
        </div>
      </section>

      <article className="py-12">
        <div className={`${SECTION_CLASS} space-y-14`}>
          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <BarChart3 className="h-6 w-6 text-copper" aria-hidden="true" />
              A register of more than half a million entities
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The Cyprus register held <strong className="text-foreground">571,218 entities</strong> at the
              time of writing. Limited companies dominate: <strong className="text-foreground">494,835</strong> are
              companies, alongside 62,101 business names, 10,339 partnerships and 3,718 overseas companies
              registered to operate a branch in Cyprus.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Volume is not the same as activity. Only <strong className="text-foreground">191,235
              entities — about one in three — are currently registered and active</strong>. A further
              269,400 have been struck off, 71,417 are in the strike-off pipeline after a reminder letter,
              and the remainder are dissolved or in liquidation. For anyone assessing a Cyprus
              counterparty, that ratio is the single most important figure on this page: a name appearing
              in the register is not evidence that the business behind it still exists.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <LineChart className="h-6 w-6 text-copper" aria-hidden="true" />
              New registrations are climbing again
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Annual company formations have held between roughly 13,000 and 16,000 for a decade, with a
              clear dip to 13,223 in 2020. The trend since has been upward: 16,407 companies were
              registered in 2024 and <strong className="text-foreground">18,857 in 2025 — the strongest
              year in the recent series</strong>. Registrations in the first months of 2026 are running
              ahead of the comparable 2025 pace.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The live month-by-month breakdown, updated from registrar publications, is on our{" "}
              <Link to="/statistics" className="text-primary hover:underline">registry statistics dashboard</Link>.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <MapPin className="h-6 w-6 text-copper" aria-hidden="true" />
              Where Cyprus companies are based
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Registered offices concentrate in the two largest cities. <strong className="text-foreground">
              Nicosia hosts 259,455 entities (45%)</strong> and <strong className="text-foreground">Limassol
              170,557 (30%)</strong>, together accounting for three quarters of the register. Larnaca
              follows with 58,536, then Paphos (32,459) and Famagusta (16,180). Limassol's share reflects
              its role as the island's shipping and international-business hub — a pattern visible in the
              name data below.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <Building2 className="h-6 w-6 text-copper" aria-hidden="true" />
              What Cyprus companies do
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Entity names are a useful proxy for activity. Across the register, the most common
              name words point to trading (<strong className="text-foreground">39,176 entities</strong>),
              investments (28,530), services (19,373) and shipping (12,692) — the four pillars of the
              Cyprus international business sector, followed by management, consulting, property and
              construction.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The register is also strikingly international in language: <strong className="text-foreground">
              92% of entity names are written in Latin characters</strong> and only 38,134 in Greek — a
              legacy of Cyprus's role as a regional corporate domicile. The full breakdown of name
              patterns, industries and language split is on the{" "}
              <Link to="/statistics/company-names" className="text-primary hover:underline">activities statistics page</Link>.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 font-heading text-2xl">
              <ShieldCheck className="h-6 w-6 text-copper" aria-hidden="true" />
              What this means before you do business
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Two-thirds of the entities ever registered in Cyprus are no longer active, yet their names
              still circulate in old contracts, invoices and directories. Before extending credit, signing
              a contract or paying an invoice to a Cyprus entity, verify three things directly from the
              register:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-muted-foreground">
              <li><strong className="text-foreground">Current status</strong> — "Registered" versus struck off or in liquidation.</li>
              <li><strong className="text-foreground">Exact legal name and HE number</strong> — trading styles and similar names are common.</li>
              <li><strong className="text-foreground">Directors, shareholders and filing history</strong> — available through official registry reports and certificates.</li>
            </ul>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link to="/search" search={{ q: "", page: 1 }}>
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  Search the Cyprus register
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/pricing">
                  View reports and certificates
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="flex items-center gap-2 font-heading text-xl">
              <Globe2 className="h-5 w-5 text-copper" aria-hidden="true" />
              About the data and the publisher
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              All figures in this article are drawn from Cyprus registry data as published on this site's{" "}
              <Link to="/statistics" className="text-primary hover:underline">statistics</Link> and{" "}
              <Link to="/statistics/company-names" className="text-primary hover:underline">activities statistics</Link>{" "}
              pages, refreshed from registrar records. Companies House Cyprus is an independent commercial
              service operated by Infocredit Group Limited (HE4404) and is not affiliated with the
              Government of the Republic of Cyprus or the Department of Registrar of Companies and
              Intellectual Property.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Journalists and researchers: contact{" "}
              <a href="mailto:info@companieshousecyprus.com" className="text-primary hover:underline">
                info@companieshousecyprus.com
              </a>{" "}
              for commentary or additional cuts of this data.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
