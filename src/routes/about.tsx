import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import {
  Building2,
  ExternalLink,
  FileCheck2,
  Globe2,
  Info,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getRegistryStats } from "@/lib/companies.functions";
import { formatEntityCount, formatRefreshDate, hasEntityCount } from "@/lib/registry-stats";
import iso9001Asset from "@/assets/eurocert-iso-9001.png.asset.json";
import iso27001Asset from "@/assets/eurocert-iso-27001.png.asset.json";
import iso22301Asset from "@/assets/eurocert-iso-22301.png.asset.json";

const TITLE = "About Companies House Cyprus | An Infocredit Group Service";
const DESCRIPTION =
  "Companies House Cyprus is an independent Infocredit Group service for searching Cyprus companies and ordering official Registrar-issued certificates, company profiles and credit reports.";
const CANONICAL = "https://companieshousecyprus.com/about";

const aboutQueryOptions = () =>
  queryOptions({
    queryKey: ["registry-stats"],
    queryFn: () => getRegistryStats(),
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/about")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(aboutQueryOptions());
  },
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: CANONICAL },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://www.infocreditgroup.com/#organization",
              name: "Infocredit Group Ltd",
              url: "https://www.infocreditgroup.com/",
              foundingDate: "1972",
              telephone: "+357 22 398241",
              email: "info@companieshousecyprus.com",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Chatzigeorgiou Filippou 5A, Akropoli",
                postalCode: "2006",
                addressLocality: "Nicosia",
                addressCountry: "CY",
              },
              sameAs: ["https://www.infocreditgroup.com/about/company-profile/"],
            },
            {
              "@type": "WebSite",
              "@id": "https://companieshousecyprus.com/#website",
              name: "Companies House Cyprus",
              url: "https://companieshousecyprus.com",
              inLanguage: "en",
              provider: { "@id": "https://www.infocreditgroup.com/#organization" },
              parentOrganization: { "@id": "https://www.infocreditgroup.com/#organization" },
            },
            {
              "@type": "AboutPage",
              "@id": `${CANONICAL}#aboutpage`,
              url: CANONICAL,
              name: TITLE,
              description: DESCRIPTION,
              isPartOf: { "@id": "https://companieshousecyprus.com/#website" },
              about: { "@id": "https://www.infocreditgroup.com/#organization" },
            },
            {
              "@type": "BreadcrumbList",
              "@id": `${CANONICAL}#breadcrumb`,
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://companieshousecyprus.com/",
                },
                { "@type": "ListItem", position: 2, name: "About", item: CANONICAL },
              ],
            },
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

const SERVICES = [
  {
    icon: Search,
    title: "Search the Cyprus business register",
    body: "Search companies, partnerships, business names and overseas entities registered in Cyprus. Depending on the entity and the available records, profiles may include registration status, registered office, directors, secretary, shareholders and filing information.",
    cta: "Search the register",
    to: "/cyprus-companies-registry" as const,
  },
  {
    icon: FileCheck2,
    title: "Official Registrar-issued certificates",
    body: "Order certificates and certified copies issued by the Department of Registrar of Companies and Intellectual Property, including certificates of incorporation, directors and secretary, shareholders, registered office, capital and good standing.",
    note: "Companies House Cyprus does not issue or alter official certificates. We facilitate their ordering and digital delivery.",
    cta: "View certificates",
    to: "/pricing" as const,
  },
  {
    icon: Building2,
    title: "Company profiles and credit reports",
    body: "Where additional due diligence is required, users can order consolidated company profiles, credit reports and KYB-related information provided by Infocredit Group using registry information and other lawfully available sources.",
    cta: "Contact us",
    to: "/contact" as const,
  },
  {
    icon: Globe2,
    title: "International document support",
    body: "Apostille, legalisation and translation support can be arranged on request. Acceptance requirements vary by country, institution and intended use, so customers should confirm the exact requirements with the receiving organisation.",
    cta: "Request assistance",
    to: "/contact" as const,
  },
];

const AUDIENCES = [
  "Law firms preparing corporate and transaction files",
  "Corporate service providers conducting client onboarding",
  "Banks and payment institutions performing KYB checks",
  "Compliance professionals conducting due diligence",
  "Procurement teams verifying bidders and counterparties",
  "Businesses and individuals seeking Cyprus company information",
];

const CERTIFICATIONS = [
  { asset: iso9001Asset, code: "ISO 9001", label: "Quality Management", alt: "EUROCERT certified management system — ISO 9001:2015" },
  { asset: iso27001Asset, code: "ISO/IEC 27001", label: "Information Security Management", alt: "EUROCERT certified management system — ISO/IEC 27001:2023" },
  { asset: iso22301Asset, code: "ISO 22301", label: "Business Continuity Management", alt: "EUROCERT certified management system — ISO 22301:2019" },
];

const DATA_POINTS = [
  "Each company profile displays the date on which its information was last updated.",
  "Registry information reflects filings submitted to and processed by the Registrar.",
  "A company profile is not a substitute for an official certificate where certified evidence is required.",
  "Official certificates reflect the information notified to the Registrar up to their date of issue.",
  "Company information may be supplemented by other public or lawfully accessible sources where clearly identified.",
  "Processing and delivery times may depend on the Registrar, document type and requested additional services.",
];

function AboutPage() {
  const { data: stats } = useSuspenseQuery(aboutQueryOptions());
  const countValue = formatEntityCount(stats?.count);
  const showCountLabel = hasEntityCount(stats?.count);
  const refreshDate = formatRefreshDate(stats?.lastRefresh);

  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-14 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">
            About Companies House Cyprus
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Cyprus company information, made searchable and actionable
          </h1>
          <div className="mt-6 max-w-3xl space-y-4 text-base text-primary-foreground/80 sm:text-lg">
            <p>
              Companies House Cyprus is an independent company-information platform operated by Infocredit Group Ltd,
              a Cyprus-based provider of business information, credit risk and compliance solutions established in
              1972.
            </p>
            <p>
              Search Cyprus-registered companies and other business entities, review available registry information,
              and order official certificates issued by the Department of Registrar of Companies and Intellectual
              Property.
            </p>
          </div>

          <p className="mt-6 flex max-w-3xl items-start gap-3 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-primary-foreground/80">
            <Info className="mt-0.5 size-4 shrink-0 text-copper" aria-hidden="true" />
            <span>
              Companies House Cyprus is an independent commercial service. It is not a government website and is not
              affiliated with the Government of the Republic of Cyprus.
            </span>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg">
              <Link to="/cyprus-companies-registry">Search a company</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10">
              <Link to="/pricing">View certificates and pricing</Link>
            </Button>
          </div>

          <dl className="mt-12 grid gap-8 border-t border-white/15 pt-8 sm:grid-cols-3">
            <div>
              <dt className={showCountLabel ? "font-display text-3xl font-bold text-copper" : "font-display text-xl font-bold text-copper"}>
                {countValue}
              </dt>
              {showCountLabel ? (
                <dd className="mt-1 text-sm text-primary-foreground/70">Entities in our searchable database</dd>
              ) : null}
              {refreshDate ? (
                <dd className="mt-1 text-xs text-primary-foreground/55">Last updated: {refreshDate}</dd>
              ) : null}
            </div>
            <div>
              <dt className="font-display text-3xl font-bold text-copper">Since 1972</dt>
              <dd className="mt-1 text-sm text-primary-foreground/70">Business-information experience</dd>
              <dd className="mt-1 text-xs text-primary-foreground/55">Operated by Infocredit Group Ltd</dd>
            </div>
            <div>
              <dt className="font-display text-3xl font-bold text-copper">1–2 business days</dt>
              <dd className="mt-1 text-sm text-primary-foreground/70">Typical certificate delivery</dd>
              <dd className="mt-1 text-xs text-primary-foreground/55">
                Subject to Registrar processing and document type
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-16 px-4 py-14 md:space-y-20 md:py-16">
        <section aria-labelledby="what-we-provide">
          <h2 id="what-we-provide" className="text-2xl font-semibold md:text-3xl">
            What we provide
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {SERVICES.map((service) => (
              <article key={service.title} className="flex flex-col rounded-xl border bg-card p-6 shadow-panel sm:p-7">
                <service.icon className="size-6 text-copper" aria-hidden="true" />
                <h3 className="mt-4 font-display text-lg font-semibold">{service.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.body}</p>
                {service.note ? (
                  <p className="mt-3 rounded-lg border bg-sand px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                    {service.note}
                  </p>
                ) : null}
                <div className="mt-5 pt-1">
                  <Button asChild variant="outline" size="sm">
                    <Link to={service.to}>{service.cta}</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          aria-labelledby="infocredit"
          className="rounded-2xl border bg-sand p-6 sm:p-8 md:p-10"
        >
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <h2 id="infocredit" className="text-2xl font-semibold md:text-3xl">
                Backed by Infocredit Group
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Companies House Cyprus is operated by Infocredit Group Ltd, a Cyprus-based business-information
                company established in 1972.
              </p>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                For more than five decades, Infocredit Group has supported financial institutions, law firms,
                corporate service providers, compliance teams and businesses with company information, credit risk,
                KYC, KYB and compliance solutions in Cyprus and international markets.
              </p>
              <a
                href="https://www.infocreditgroup.com/about/company-profile/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-copper hover:underline"
              >
                Learn more about Infocredit Group
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </div>

            <div className="rounded-xl border bg-background p-5 sm:p-6">
              <h3 className="font-display text-base font-semibold">Certified management systems</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                These certifications relate to Infocredit Group Ltd’s management systems, independently audited by
                EUROCERT. They are not certifications of this website.
              </p>
              <ul className="mt-4 space-y-3">
                {CERTIFICATIONS.map((cert) => (
                  <li key={cert.code} className="flex items-center gap-3">
                    <img
                      src={cert.asset.url}
                      alt={cert.alt}
                      className="h-12 w-auto rounded-md bg-background p-1"
                      loading="lazy"
                    />
                    <span className="text-sm">
                      <span className="block font-medium">{cert.code}</span>
                      <span className="text-muted-foreground">{cert.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <Button asChild variant="outline" size="sm">
                  <Link to="/certifications">View our certifications</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="who-uses">
          <h2 id="who-uses" className="text-2xl font-semibold md:text-3xl">
            Who uses the platform
          </h2>
          <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
            Companies House Cyprus helps professionals and businesses obtain Cyprus company information and documents
            efficiently.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AUDIENCES.map((audience) => (
              <li key={audience} className="flex items-start gap-2.5 rounded-xl border bg-card p-4 text-sm">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-copper" aria-hidden="true" />
                <span>{audience}</span>
              </li>
            ))}
          </ul>
          <p className="mt-8 max-w-3xl leading-relaxed text-muted-foreground">
            The public company directory is available without charge. Official certificates, company profiles and
            credit reports can be ordered individually without requiring a subscription. Separate commercial
            arrangements may be available for high-volume or API users.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/pricing">See pricing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Talk to us</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="data-sources" className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <h2 id="data-sources" className="text-2xl font-semibold md:text-3xl">
              Data sources and update policy
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Company information is sourced primarily from records made available by the Department of Registrar of
              Companies and Intellectual Property.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We provide a searchable directory of Cyprus-registered business entities using registry-sourced
              information, and you can order official Registrar-issued certificates for eligible entities. Official
              certificates may be used for legal, banking, compliance and administrative purposes, subject to the
              requirements of the receiving organisation.
            </p>
            <a
              href="https://www.companies.gov.cy/en/business-entities/2-company/5-lifecycle/1-running-a-company/5-guidance/obtaining-certified-copies-certificates/overview"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-copper hover:underline"
            >
              Official Registrar guidance on certified certificates
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
          <div className="rounded-xl border bg-card p-6 shadow-panel">
            <h3 className="font-display text-base font-semibold">What this means in practice</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              {DATA_POINTS.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-copper" aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
