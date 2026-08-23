import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, FileCheck2, MapPin, Users } from "lucide-react";
import { getCompanyBySlug } from "@/lib/companies.functions";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { PRODUCTS, formatPrice } from "@/lib/products";
import { formatDate, latinAddress } from "@/lib/format";


const companyQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["company", slug],
    queryFn: () => getCompanyBySlug({ data: { slug } }),
  });

const ORDERABLE = [
  "certificate-of-good-standing",
  "cyprus-company-profile",
  "certificate-of-directors-and-secretary",
  "certificate-of-shareholders",
  "kyb-due-diligence-pack",
];

export const Route = createFileRoute("/company/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(companyQueryOptions(params.slug));
    return { name: data.company.name, officialNo: data.company.official_no, status: data.company.status_en };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Company unavailable | Companies House Cyprus" }, { name: "robots", content: "noindex" }],
      };
    }
    const label = loaderData.officialNo ?? params.slug.toUpperCase();
    const title = `${loaderData.name} (${label}) — Cyprus company profile`;
    const description = `${loaderData.name}, ${label}: ${loaderData.status ?? "registered"} Cyprus company. Registered office, directors, secretary and Registrar certificates.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: CompanyPage,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold">Company not found</h1>
      <p className="mt-4 text-muted-foreground">We could not find a company with that identifier.</p>
      <Button asChild className="mt-6">
        <Link to="/search" search={{ q: "", page: 1 }}>Search the register</Link>
      </Button>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold">Unable to load company</h1>
      <p className="mt-4 text-muted-foreground">{error.message}</p>
      <Link to="/" className="mt-6 text-copper hover:underline">Back to home</Link>
    </div>
  ),
});

function statusTone(group: string | null | undefined) {
  if (group === "active") return "bg-olive/15 text-olive border-olive/30";
  if (group === "dissolved" || group === "struck-off") return "bg-destructive/10 text-destructive border-destructive/25";
  return "bg-muted text-muted-foreground border-border";
}

function CompanyPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(companyQueryOptions(slug));
  const { company, officials } = data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    identifier: company.official_no,
    address: company.address_full
      ? {
          "@type": "PostalAddress",
          streetAddress: [company.building, company.street].filter(Boolean).join(", "),
          addressLocality: company.locality ?? undefined,
          addressRegion: company.district_en ?? undefined,
          postalCode: company.postcode ?? undefined,
          addressCountry: company.is_foreign_address ? undefined : "CY",
        }
      : undefined,
    knowsAbout: company.type_en ?? undefined,
  };

  const registrationDate = formatDate(company.registration_date);
  const statusDate = formatDate(company.status_date);
  const addressEl = company.address_full;
  const addressEn = latinAddress(company.address_full);

  const facts: { label: string; value: string }[] = [
    { label: "Registration number", value: company.official_no ?? String(company.reg_number) },
    { label: "Company type", value: company.type_en ?? "—" },
    { label: "Sub-type", value: company.subtype_en ?? "—" },
    { label: "Status", value: company.status_en ?? "—" },
    { label: "Status date", value: statusDate ?? "—" },
    { label: "Registration date", value: registrationDate ?? "—" },
    { label: "District", value: company.district_en ?? "—" },
    { label: "Officials on record", value: String(company.officials_count ?? officials.length) },
  ];


  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-12 md:py-16">
          <nav className="flex flex-wrap items-center gap-2 text-xs text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Home</Link>
            <span>/</span>
            <Link to="/search" search={{ q: "", page: 1 }} className="hover:text-primary-foreground">Register</Link>
            {company.district_en && (
              <>
                <span>/</span>
                <Link
                  to="/companies/city/$district"
                  params={{ district: company.district_en.toLowerCase() }}
                  className="hover:text-primary-foreground"
                >
                  {company.district_en}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-primary-foreground/90">{company.name}</span>
          </nav>

          <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
            <div>
              <h1 className="max-w-3xl text-3xl font-bold md:text-4xl">{company.name}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-primary-foreground/75">
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(company.status_group)}`}>
                  {company.status_en ?? "Unknown status"}
                </span>
                <span className="inline-flex items-center gap-1.5"><FileCheck2 className="size-4 text-copper" />{company.official_no}</span>
                {registrationDate && (
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-copper" />Registered {registrationDate}</span>
                )}

                {company.district_en && (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-copper" />{company.district_en}</span>
                )}
              </div>
            </div>
            <Button asChild size="lg" className="bg-copper text-copper-foreground hover:bg-copper/90">
              <a href="#order">Order certificates</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <section className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Building2 className="size-5 text-copper" /> Registry record
            </h2>
            <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} className="border-b pb-3">
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{fact.label}</dt>
                  <dd className="mt-1 font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MapPin className="size-5 text-copper" /> Registered office
            </h2>
            {addressEl ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Greek (official)</p>
                  <address lang="el" className="mt-1 not-italic leading-relaxed">
                    {addressEl}
                  </address>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">English (transliterated)</p>
                  <address lang="en" className="mt-1 not-italic leading-relaxed">
                    {addressEn}
                  </address>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-muted-foreground">No registered office address on record.</p>
            )}
            {(company.district_en || company.postcode) && (
              <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
                District: {company.district_en ?? "—"}
                {company.district_el ? ` (${company.district_el})` : ""}
                {company.postcode ? ` · Postcode ${company.postcode}` : ""}
              </p>
            )}

          </section>

          <section className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Users className="size-5 text-copper" /> Directors &amp; secretary
            </h2>
            {officials.length > 0 ? (
              <ul className="mt-4 divide-y">
                {officials.map((official, index) => (
                  <li key={index} className="flex items-center justify-between gap-4 py-3">
                    <span className="font-medium">{official.person_name}</span>
                    <span className="text-sm text-muted-foreground">{official.position_en ?? official.position_el}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Officials are not published for this entity in our copy of the register. A Certificate of Directors &amp;
                Secretary returns the current board directly from the Registrar.
                <div className="mt-4">
                  <AddToCartButton
                    productSlug="certificate-of-directors-and-secretary"
                    companySlug={company.slug}
                    companyName={company.name}
                    companyNumber={company.official_no}
                    size="sm"
                    variant="outline"
                    label="Order officials certificate"
                  />
                </div>
              </div>
            )}
          </section>

          <p className="text-xs text-muted-foreground">
            Last updated: {company.updated_at ? new Date(company.updated_at).toLocaleDateString("en-GB") : "—"} · Source:
            Department of Registrar of Companies and Intellectual Property.
          </p>
        </div>

        <aside id="order" className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="font-display text-lg font-semibold">Order for this company</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Certified documents for {company.name}, delivered digitally.
            </p>
            <ul className="mt-5 space-y-3">
              {ORDERABLE.map((productSlug) => {
                const product = PRODUCTS.find((item) => item.slug === productSlug);
                if (!product) return null;
                return (
                  <li key={product.slug} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          to="/report/$type"
                          params={{ type: product.slug }}
                          className="text-sm font-semibold hover:text-copper"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-0.5 text-xs text-muted-foreground">{product.delivery}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{formatPrice(product.price)}</span>
                    </div>
                    <AddToCartButton
                      productSlug={product.slug}
                      companySlug={company.slug}
                      companyName={company.name}
                      companyNumber={company.official_no}
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                    />
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-xl border bg-sand p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Need something else?</p>
            <p className="mt-1">Apostille, certified translation or an urgent same-day certificate.</p>
            <Button asChild variant="outline" className="mt-4 w-full">
              <Link to="/contact">Request a quote</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

