import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, CircleHelp, FileCheck2, Info, Lock, MapPin, Network, Receipt, ShieldCheck, Star, Users } from "lucide-react";
import { getCompanyBySlug, getRelatedCompanies, getSimilarCompanies } from "@/lib/companies.functions";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Button } from "@/components/ui/button";
import { ScreeningStatusBadge } from "@/components/screening/ScreeningStatus";
import { PRODUCTS, formatPrice } from "@/lib/products";
import { COMPANY_PAGE_COPY } from "@/lib/sanctions/screening-scope";
import { priceBreakdown } from "@/lib/pricing";
import { OFFICIALS_ON_RECORD_DESCRIPTION, OFFICIALS_ON_RECORD_LABEL } from "@/lib/labels";
import { companyAge, displayOfficialNo, formatDate, isBusinessName, maskName, officialNameDisplay, resolveAddressDisplay } from "@/lib/format";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { canonicalRedirectTarget, companyCanonicalSlug, normalizeCompanySlug } from "@/lib/slug";
import { classifyLegacyPath, extractRegistryToken } from "@/lib/legacy-url";
import { companyDescription, companyTitle } from "@/lib/seo/company-meta";
import { companyOrganizationJsonLd } from "@/lib/seo/company-jsonld";


function RelatedCompanies({ slug }: { slug: string }) {
  const { data } = useQuery({
    queryKey: ["related", slug],
    queryFn: () => getRelatedCompanies({ data: { slug } }),
    staleTime: 5 * 60 * 1000,
  });

  const byAddress = data?.byAddress ?? [];
  const byOfficial = data?.byOfficial ?? [];
  if (byAddress.length === 0 && byOfficial.length === 0) return null;

  return (
    <section className="rounded-xl border bg-card p-6 shadow-panel">
      <div className="flex items-center gap-2">
        <Network className="size-5 text-copper" />
        <h2 className="font-display text-xl font-semibold">Related companies</h2>
      </div>
      <p className="mt-1 text-base text-muted-foreground">
        Entities connected to this company through a shared registered office address or shared officials.
      </p>
      <p className="mt-3 rounded-lg border border-copper/30 bg-copper/5 px-3 py-2 text-sm text-muted-foreground">
        <strong className="font-semibold text-foreground">Note:</strong> these are possible matches identified using
        name matching. Similar or identical names do not always indicate the same person or entity — please verify
        before relying on a connection.
      </p>

      {byAddress.length > 0 && (
        <div className="mt-5">
          <h3 className="text-base font-semibold">At the same registered address</h3>
          <ul className="mt-2 divide-y">
            {byAddress.map((row) => (
              <li key={row.slug} className="flex flex-col gap-0.5 py-3">
                <Link to="/company/$slug" params={{ slug: companyCanonicalSlug(row) }} className="text-base font-medium hover:text-copper">
                  {row.name}
                </Link>
                <span className="text-sm text-muted-foreground">{displayOfficialNo(row)}</span>
              </li>
            ))}
          </ul>
          {data && data.addressCount > byAddress.length && (
            <p className="mt-2 text-sm text-muted-foreground">
              {data.addressCount} entities in total share this address.
            </p>
          )}
        </div>
      )}

      {byOfficial.length > 0 && (
        <div className="mt-6">
          <h3 className="text-base font-semibold">Sharing an official or owner</h3>
          <p className="mt-2 rounded-lg border border-copper/30 bg-copper/5 px-3 py-2 text-sm text-muted-foreground">
            <strong className="font-semibold text-foreground">Note:</strong> these are possible matches identified using
            name matching. Similar or identical names do not always indicate the same person or entity — please verify
            before relying on a connection.
          </p>
          <ul className="mt-3 divide-y">
            {byOfficial.map((row) => (
              <li key={row.slug} className="flex flex-col gap-0.5 py-3">
                <Link to="/company/$slug" params={{ slug: companyCanonicalSlug(row) }} className="text-base font-medium hover:text-copper">
                  {row.name}
                </Link>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{displayOfficialNo(row)}</span>
                  <span className="text-sm text-muted-foreground">via {row.via}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

    </section>
  );
}




const companyQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["company", slug],
    queryFn: () => getCompanyBySlug({ data: { slug } }),
  });

const similarQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["similar", slug],
    queryFn: () => getSimilarCompanies({ data: { slug } }),
    staleTime: 10 * 60 * 1000,
  });

interface CompanyFaq {
  question: string;
  answer: string;
}

function buildCompanyFaqs(args: {
  name: string;
  officialNo: string;
  businessName: boolean;
  officialsCount: number;
  directorNames: string[];
  status: string | null;
  registrationDate: string | null;
}): CompanyFaq[] {
  const { name, businessName, officialsCount, directorNames, status, registrationDate } = args;

  let officersAnswer: string;
  if (businessName) {
    officersAnswer = `${name} is a registered business name. Its registered owner is not shown publicly here; ownership details are released through the Cyprus Company Profile (structure) report, which you can order on this page.`;
  } else if (officialsCount > 0) {
    const listed = directorNames.length > 0 ? `, including ${directorNames.join(", ")}` : "";
    officersAnswer = `${name} has ${officialsCount} officer${officialsCount === 1 ? "" : "s"} on record in our copy of the Cyprus register${listed}. The current certified list is available in the Certificate of Directors & Secretary.`;
  } else {
    officersAnswer = `Officers are not published for ${name} in our copy of the register. A Certificate of Directors & Secretary returns the current board directly from the Registrar of Companies.`;
  }

  const registeredAnswer = registrationDate
    ? `${name} was registered with the Cyprus Registrar of Companies on ${registrationDate}.`
    : `The registration date for ${name} is not present in our copy of the register.`;

  const statusAnswer = status
    ? `${name} is currently recorded as “${status}” in the Cyprus companies register.`
    : `The current registry status of ${name} is not available in our copy of the register.`;

  return [
    { question: `Who are the ${businessName ? "owners" : "directors"} of ${name}?`, answer: officersAnswer },
    { question: `When was ${name} registered?`, answer: registeredAnswer },
    { question: `Is ${name} still active?`, answer: statusAnswer },
  ];
}

const ORDERABLE = [
  "certificate-of-good-standing",
  "cyprus-company-profile",
  "certificate-of-directors-and-secretary",
  "certificate-of-shareholders",
  "certificate-of-capital",
  "certificate-of-strike-off",
  "memorandum-and-articles-of-association",
  "cyprus-credit-report",
  "kyb-due-diligence-pack",
  "due-diligence-report",
  "sanctions-risk-snapshot",
];

export const Route = createFileRoute("/company/$slug")({
  validateSearch: (search: Record<string, unknown>): { product?: string } =>
    typeof search["product"] === "string" ? { product: search["product"] as string } : {},
  // Legacy WordPress URLs (template placeholders like "{{vcompany.name}}-c4404",
  // "dfd.name") must never render content. Anything else is resolved in the
  // loader, which knows the company's canonical name-based slug.
  beforeLoad: ({ params }) => {
    const legacy = classifyLegacyPath(`/company/${params.slug}`);
    const token = legacy ? extractRegistryToken(params.slug) : null;
    if (legacy && !token) {
      // Template-leak URL with nothing to resolve: a clean not-found, never content.
      throw notFound();
    }
    if (legacy && token) {
      throw redirect({
        to: "/company/$slug",
        params: { slug: normalizeCompanySlug(token) },
        statusCode: 301,
        replace: true,
      });
    }
  },
  loader: async ({ params, context }) => {
    let data: Awaited<ReturnType<typeof getCompanyBySlug>>;
    try {
      data = await context.queryClient.ensureQueryData(companyQueryOptions(params.slug));
    } catch {
      if (import.meta.env.SSR) {
        const { setNoStoreHeaders } = await import("@/lib/http-cache.server");
        setNoStoreHeaders();
      }
      // Unknown company: a real 404 (not a 500) so crawlers drop it cleanly.
      throw notFound();
    }

    const c = data.company;
    // Name-based canonical URL: ID-form and historic name slugs both keep
    // working, but permanently redirect to the current canonical path.
    const canonicalSlug = c.canonical_slug ?? companyCanonicalSlug(c);
    const redirectTo = canonicalRedirectTarget(params.slug, c);
    if (redirectTo) {
      throw redirect({
        to: "/company/$slug",
        params: { slug: redirectTo },
        statusCode: 301,
        replace: true,
      });
    }

    if (import.meta.env.SSR) {
      const { setCompanyPageCacheHeaders } = await import("@/lib/http-cache.server");
      setCompanyPageCacheHeaders({
        slug: c.slug,
        updatedAt: c.updated_at ?? null,
      });
    }

    const businessName = isBusinessName(c);
    // Officer names are not published on the free public page — they are
    // released in the purchased reports/certificates only.
    const directorNames: string[] = [];

    const faq = buildCompanyFaqs({
      name: c.name,
      officialNo: displayOfficialNo(c),
      businessName,
      officialsCount: data.officials.length,
      directorNames,
      status: c.status_en,
      registrationDate: formatDate(c.registration_date),
    });

    // SSR the "People also viewed" strip so the internal links are indexable.
    const similarData = await context.queryClient.ensureQueryData(similarQueryOptions(canonicalSlug)).catch(() => null);

    return {
      canonicalSlug,
      name: c.name,
      officialNo: displayOfficialNo(c),
      status: c.status_en,
      statusGroup: c.status_group ?? null,
      typeEn: c.type_en ?? null,
      subtypeEn: c.subtype_en ?? null,
      registrationDate: formatDate(c.registration_date),
      registrationIso: c.registration_date ? String(c.registration_date).slice(0, 10) : null,
      district_en: c.district_en ?? null,
      addressFull: c.address_full ?? null,
      building: c.building ?? null,
      street: c.street ?? null,
      locality: c.locality ?? null,
      postcode: c.postcode ?? null,
      isForeignAddress: Boolean(c.is_foreign_address),
      businessName,
      officialsCount: data.officials.length,
      directorNames,
      faq,
      similar: similarData?.similar ?? [],
    };
  },


  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Company unavailable | Companies House Cyprus" }, { name: "robots", content: "noindex" }],
      };
    }
    const idSlug = normalizeCompanySlug(params.slug);
    const canonicalSlug = loaderData.canonicalSlug || idSlug;
    const title = companyTitle({
      name: loaderData.name,
      officialNo: loaderData.officialNo ?? idSlug,
    });
    const description = companyDescription({
      name: loaderData.name,
      officialNo: loaderData.officialNo ?? idSlug,

      status: loaderData.status,
      statusGroup: loaderData.statusGroup,
      typeEn: loaderData.typeEn,
      districtEn: loaderData.district_en,
      registrationDate: loaderData.registrationDate,
      businessName: loaderData.businessName,
    });


    const breadcrumbItems: Array<{ "@type": "ListItem"; position: number; name: string; item: string }> = [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://companieshousecyprus.com/" },
      { "@type": "ListItem", position: 2, name: "Register", item: "https://companieshousecyprus.com/search" },
    ];
    if (loaderData.district_en) {
      breadcrumbItems.push({
        "@type": "ListItem",
        position: 3,
        name: loaderData.district_en,
        item: `https://companieshousecyprus.com/companies/city/${loaderData.district_en.toLowerCase()}`,
      });
    }
    breadcrumbItems.push({
      "@type": "ListItem",
      position: breadcrumbItems.length + 1,
      name: loaderData.name,
      item: `https://companieshousecyprus.com/company/${canonicalSlug}`,
    });

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { property: "og:url", content: `https://companieshousecyprus.com/company/${canonicalSlug}` },
      ],
      links: [{ rel: "canonical", href: `https://companieshousecyprus.com/company/${canonicalSlug}` }],

      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumbItems,
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(companyOrganizationJsonLd(loaderData, canonicalSlug)),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: loaderData.faq.map((item) => ({
              "@type": "Question",
              name: item.question,
              acceptedAnswer: { "@type": "Answer", text: item.answer },
            })),
          }),
        },
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
      <Link to="/" className="mt-6 text-copper hover:underline">Back to Cyprus company search</Link>
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
  const { product: pendingProductSlug } = Route.useSearch();
  const loaderData = Route.useLoaderData();
  const { data } = useSuspenseQuery(companyQueryOptions(slug));
  const { company, officials } = data;
  const { faq, similar } = loaderData;


  const pendingProduct = pendingProductSlug ? PRODUCTS.find((item) => item.slug === pendingProductSlug) : undefined;
  const businessName = isBusinessName(company);
  const profileProduct = PRODUCTS.find((item) => item.slug === "cyprus-company-profile");
  const registrationDate = formatDate(company.registration_date);
  const statusDate = formatDate(company.status_date);
  const age = companyAge(company.registration_date);

  const addressDisplay = resolveAddressDisplay(company);

  const facts: { label: string; value: string; description?: string }[] = [
    { label: "Registration number", value: displayOfficialNo(company) },
    { label: "Company type", value: company.type_en ?? "—" },
    { label: "Sub-type", value: company.subtype_en ?? "—" },
    { label: "Status", value: company.status_en ?? "—" },
    { label: "Status date", value: statusDate ?? "—" },
    { label: "Registration date", value: registrationDate ?? "—" },
    { label: "District", value: company.district_en ?? "—" },
    {
      label: OFFICIALS_ON_RECORD_LABEL,
      value: officials.length > 0 ? String(officials.length) : "Not in our copy",
      description:
        officials.length > 0
          ? OFFICIALS_ON_RECORD_DESCRIPTION
          : "No directors, secretaries or owners are present for this entity in our copy of the register. A Certificate of Directors & Secretary returns them directly from the Registrar.",
    },
  ];




  return (
    <div>

      {pendingProduct && (
        <div className="border-b border-copper/30 bg-copper/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Add {pendingProduct.name} for {company.name}?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatPrice(pendingProduct.price)}
                {pendingProduct.category === "certificate" ? " · certificate only, €50 handling fee added at checkout" : " · incl. VAT"}
              </p>
            </div>
            <AddToCartButton
              productSlug={pendingProduct.slug}
              companySlug={company.slug}
              companyName={company.name}
              companyNumber={displayOfficialNo(company)}
              label={`Add ${pendingProduct.name}`}
              className="shrink-0 bg-copper text-copper-foreground hover:bg-copper/90"
            />
          </div>
        </div>
      )}

      <section className="surface-deep relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary-glow/20 to-transparent" />
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-copper/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-primary-glow/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 md:py-16">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-medium uppercase tracking-widest text-primary-foreground/50 sm:text-[11px]">
              <li>
                <Link to="/" className="transition-colors hover:text-primary-foreground">Cyprus company search</Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to="/search" search={{ q: "", page: 1 }} className="transition-colors hover:text-primary-foreground">Register</Link>
              </li>
              {company.district_en && (
                <>
                  <li aria-hidden="true">/</li>
                  <li className="min-w-0">
                    <Link
                      to="/companies/city/$district"
                      params={{ district: company.district_en.toLowerCase() }}
                      className="block max-w-[8rem] truncate transition-colors hover:text-primary-foreground"
                    >
                      {company.district_en}
                    </Link>
                  </li>
                </>
              )}
              <li aria-hidden="true">/</li>
              <li className="min-w-0">
                <span aria-current="page" className="block max-w-[14rem] truncate text-copper sm:max-w-[24rem]">
                  {company.name}
                </span>
              </li>
            </ol>
          </nav>


          <div className="mt-6 flex flex-col gap-6 sm:mt-8 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
                <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusTone(company.status_group)}`}>
                  {company.status_en ?? "Unknown status"}
                </span>
                {company.type_en && (
                  <span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/70">
                    {company.type_en}
                  </span>
                )}
              </div>
              <h1 className="max-w-3xl font-display text-2xl font-bold tracking-tight break-words sm:text-3xl md:text-4xl lg:text-5xl">{company.name}</h1>
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-primary-foreground/70 sm:text-sm">
                <span className="inline-flex items-center gap-1.5"><FileCheck2 className="size-4 shrink-0 text-copper" />{displayOfficialNo(company)}</span>
                {registrationDate && (
                  <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 shrink-0 text-copper" />Registered {registrationDate}</span>
                )}
                {company.district_en && (
                  <span className="inline-flex min-w-0 items-center gap-1.5"><MapPin className="size-4 shrink-0 text-copper" /><span className="truncate">{company.district_en}, Cyprus</span></span>
                )}
              </p>
            </div>

            <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                asChild
                size="lg"
                className="h-12 w-full rounded-xl bg-copper px-6 font-display text-sm font-bold text-copper-foreground shadow-lg shadow-copper/25 transition-all hover:-translate-y-0.5 hover:bg-copper/90 hover:shadow-xl hover:shadow-copper/30 sm:h-14 sm:w-auto sm:px-8 sm:text-base"
              >
                <a href="#reports" className="gap-2">
                  Order Company Profile
                  <Star className="size-5 shrink-0 fill-copper-foreground" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-xl border-primary-foreground/25 bg-primary-foreground/5 px-6 font-display text-sm font-bold text-primary-foreground backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-primary-foreground/10 hover:text-primary-foreground sm:h-14 sm:w-auto sm:px-8 sm:text-base"
              >
                <a href="#certificates" className="gap-2">
                  Order certificates
                  <ShieldCheck className="size-5 shrink-0" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-xl border-primary-foreground/25 bg-primary-foreground/5 px-6 font-display text-sm font-bold text-primary-foreground backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:bg-primary-foreground/10 hover:text-primary-foreground sm:h-14 sm:w-auto sm:px-8 sm:text-base"
              >
                <a href="#reports" className="gap-2">
                  Order reports
                  <FileCheck2 className="size-5 shrink-0" />
                </a>
              </Button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 md:mt-12 lg:grid-cols-3">
            <div className="group min-w-0 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 backdrop-blur-sm transition-colors hover:border-copper/50 sm:p-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 sm:text-xs">Registry Status</p>
              <div className="flex min-w-0 items-center gap-3">
                <span className={`size-2 shrink-0 rounded-full ${company.status_group === "active" ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]" : "bg-copper shadow-[0_0_10px_rgba(205,127,50,0.5)]"}`} />
                <span className="truncate font-display text-lg font-semibold text-primary-foreground sm:text-xl">{company.status_en ?? "Unknown"}</span>
              </div>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-primary-foreground/10">
                <div className={`h-full ${company.status_group === "active" ? "w-full bg-emerald-500/50" : "w-1/3 bg-copper/50"}`} />
              </div>
            </div>

            <div className="group min-w-0 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 backdrop-blur-sm transition-colors hover:border-copper/50 sm:p-6">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 sm:text-xs">Company Age</p>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-display text-2xl font-bold text-primary-foreground sm:text-3xl">{age ? age.years : "—"}</span>
                <span className="text-base font-medium text-primary-foreground/70 sm:text-lg">
                  {age ? `Years${age.months ? ` ${age.months} mo` : ""}` : "Unknown"}
                </span>
              </div>
              <p className="mt-4 text-[11px] font-medium text-primary-foreground/40 sm:text-xs">
                {registrationDate ? `Incorporated ${registrationDate}` : "Registration date unavailable"}
              </p>
            </div>

            <div className="group min-w-0 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 backdrop-blur-sm transition-colors hover:border-copper/50 sm:col-span-2 sm:p-6 lg:col-span-1">
              <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground/50 sm:text-xs">Country Risk</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-display text-lg font-semibold text-primary-foreground sm:text-xl">🇨🇾 Low</span>
                <span className="flex flex-1 justify-end gap-1 sm:flex-none">
                  <span className="h-1.5 w-6 rounded-full bg-primary-glow sm:w-8" />
                  <span className="h-1.5 w-6 rounded-full bg-primary-glow/25 sm:w-8" />
                  <span className="h-1.5 w-6 rounded-full bg-primary-glow/25 sm:w-8" />
                </span>
              </div>
              <p className="mt-4 text-[11px] font-medium text-emerald-400/80 sm:text-xs">Cyprus · EU member state</p>
            </div>
          </div>
        </div>
      </section>


      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 lg:grid-cols-[1.5fr_1fr]">

        <div className="space-y-8">
          <section className="rounded-xl border bg-card p-4 shadow-panel sm:p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Building2 className="size-4 text-copper" /> Company profile
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {company.name} ({displayOfficialNo(company)}) is
              {company.type_en ? ` a ${company.type_en}` : " an entity"}
              {company.subtype_en && company.subtype_en !== company.type_en ? ` (${company.subtype_en})` : ""}
              {company.district_en ? ` registered in ${company.district_en}, Cyprus` : " registered in Cyprus"}
              {registrationDate ? `, incorporated on ${registrationDate}` : ""}
              {age ? ` — ${age.years} year${age.years === 1 ? "" : "s"}${age.months ? ` ${age.months} month${age.months === 1 ? "" : "s"}` : ""} old` : ""}.
              {company.status_en ? ` Its current registry status is “${company.status_en}”.` : ""}
              {" "}This page brings together the official registry record
              {!businessName && officials.length > 0
                ? `, ${officials.length} officer${officials.length === 1 ? "" : "s"} on record,`
                : businessName
                  ? ", ownership available via the structure report,"
                  : ""}
              {" "}the registered office address and certified documents you can order directly from the Registrar —
              company profile, credit report, certificates of good standing, directors &amp; secretary, shareholders and more.
            </p>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-panel sm:p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Building2 className="size-4 text-copper" /> Registry record
            </h2>
            <TooltipProvider delayDuration={200}>
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label} className="border-b pb-2">
                    <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <span>{fact.label}</span>
                      {fact.description && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              aria-label={`${fact.label} help`}
                              className="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:text-copper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper"
                            >
                              <Info className="size-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[16rem]">
                            {fact.description}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </dt>
                    <dd className="mt-0.5 text-sm font-medium" aria-label={`${fact.label}: ${fact.value}`}>
                      {fact.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </TooltipProvider>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MapPin className="size-5 text-copper" /> Registered office
            </h2>
            {addressDisplay ? (
              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {addressDisplay.primaryLabel}
                </p>
                <address lang="en" className="mt-1 not-italic leading-relaxed">
                  {addressDisplay.primary}
                </address>
                {addressDisplay.secondary && (
                  <p lang="el" className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                    <span className="text-xs uppercase tracking-wide">
                      {addressDisplay.secondaryLabel}:{" "}
                    </span>
                    {addressDisplay.secondary}
                  </p>
                )}
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
              {businessName ? <Lock className="size-5 text-copper" /> : <Users className="size-5 text-copper" />}
              {businessName ? "Owner" : "Directors & secretary"}
            </h2>

            {businessName ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Business names are registered to an owner (individual or company). Ownership details are released
                  through the Cyprus Company Profile (structure) report.
                </p>
                <ul className="mt-4 divide-y">
                  {(officials.length > 0 ? officials : [{ person_name: null, position_en: "Owner", position_el: null }]).map(
                    (official, index) => (
                      <li key={index} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                        <span className="select-none font-medium tracking-wide text-muted-foreground/80 blur-[0.6px]">
                          {maskName(official.person_name)}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-widest text-copper">
                          {official.position_en ?? official.position_el ?? "Owner"}
                        </span>
                      </li>
                    ),
                  )}
                </ul>

                <div className="mt-5 rounded-lg border border-copper/30 bg-copper/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-display font-semibold">Unlock the owner</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {profileProduct?.name ?? "Cyprus Company Profile"} (structure) reveals the registered owner,
                        ownership structure and filing history for {company.name}. Pay online and download the report
                        from your order once payment is confirmed.
                      </p>
                    </div>
                    {profileProduct && (
                      <span className="shrink-0 font-display text-xl font-bold text-copper">
                        {formatPrice(profileProduct.price)}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <AddToCartButton
                      productSlug="cyprus-company-profile"
                      companySlug={company.slug}
                      companyName={company.name}
                      companyNumber={displayOfficialNo(company)}
                      label="Add structure report to basket"
                    />
                    <Button asChild variant="outline">
                      <Link to="/cart">Go to basket &amp; pay</Link>
                    </Button>
                  </div>
                </div>
              </>
            ) : officials.length > 0 ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  {company.name} has {officials.length} officer{officials.length === 1 ? "" : "s"} on record in our copy
                  of the register. Individual names are not published on this free page — they are released in the
                  Certificate of Directors &amp; Secretary, certified by the Registrar and accepted by banks, KYC teams
                  and courts.
                </p>
                <ul className="mt-4 divide-y">
                  {officials.map((official, index) => {
                    const position = official.position_en ?? official.position_el;
                    const secondary =
                      official.position_en && official.position_el && official.position_en !== official.position_el
                        ? official.position_el
                        : null;
                    return (
                      <li key={index} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                        {official.suppressed ? (
                          <span className="italic text-muted-foreground">Name withheld on request</span>
                        ) : (
                          <span className="select-none font-medium tracking-wide text-muted-foreground/80 blur-[0.6px]">
                            {maskName(official.person_name)}
                          </span>
                        )}

                        <span className="text-xs font-semibold uppercase tracking-widest text-copper">
                          {position}
                          {secondary ? (
                            <span className="ml-1 font-normal normal-case tracking-normal text-muted-foreground">
                              ({secondary})
                            </span>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                      </li>
                    );
                  })}
                </ul>

                <div className="mt-5 rounded-lg border border-copper/30 bg-copper/5 p-5">
                  <p className="font-display font-semibold">Need a certified copy?</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The Certificate of Directors &amp; Secretary lists every current officer of {company.name},
                    certified by the Registrar for use with banks, KYC checks and legal filings.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <AddToCartButton
                      productSlug="certificate-of-directors-and-secretary"
                      companySlug={company.slug}
                      companyName={company.name}
                      companyNumber={displayOfficialNo(company)}
                      label="Add officials certificate"
                    />
                    <Button asChild variant="outline">
                      <Link to="/cart">Go to basket &amp; pay</Link>
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
                Officials are not published for this entity in our copy of the register. A Certificate of Directors &amp;
                Secretary returns the current board directly from the Registrar.
                <div className="mt-4">
                  <AddToCartButton
                    productSlug="certificate-of-directors-and-secretary"
                    companySlug={company.slug}
                    companyName={company.name}
                    companyNumber={displayOfficialNo(company)}
                    size="sm"
                    variant="outline"
                    label="Order officials certificate"
                  />
                </div>
              </div>
            )}
          </section>

          <section id="sanctions-screening" className="rounded-xl border bg-card p-6">
            <h2 className="font-display text-xl font-semibold">{COMPANY_PAGE_COPY.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{COMPANY_PAGE_COPY.description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <AddToCartButton
                productSlug="sanctions-risk-snapshot"
                companySlug={company.slug}
                companyName={company.name}
                companyNumber={displayOfficialNo(company)}
                label={COMPANY_PAGE_COPY.button}
              />
              <Button asChild variant="outline">
                <Link to="/cart">Go to basket &amp; pay</Link>
              </Button>
            </div>
            <div className="mt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Possible outcomes
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <ScreeningStatusBadge status="no_matches_identified" />
                <ScreeningStatusBadge status="potential_entity_match" />
                <ScreeningStatusBadge status="strong_entity_match" />
                <ScreeningStatusBadge status="confirmed_entity_match" />
                <ScreeningStatusBadge status="screening_incomplete" />
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{COMPANY_PAGE_COPY.supporting}</p>
          </section>

          <section className="rounded-xl border bg-card p-6 shadow-panel">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <CircleHelp className="size-5 text-copper" /> Frequently asked questions about {company.name}
            </h2>
            <dl className="mt-4 space-y-4">
              {faq.map((item) => (
                <div key={item.question} className="border-b pb-4 last:border-0 last:pb-0">
                  <dt className="text-sm font-semibold">{item.question}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
          </section>

          <RelatedCompanies slug={company.slug} />

          {similar.length > 0 && (
            <section className="rounded-xl border bg-card p-6 shadow-panel">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Users className="size-5 text-copper" /> People also viewed
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Other {company.type_en ? `${company.type_en}s` : "entities"} registered in {company.district_en ?? "Cyprus"}.
              </p>
              <ul className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                {similar.map((row) => (
                  <li key={row.slug} className="min-w-0">
                    <Link
                      to="/company/$slug"
                      params={{ slug: companyCanonicalSlug(row) }}
                      className="block truncate text-sm font-medium hover:text-copper"
                    >
                      {row.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">{displayOfficialNo(row)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}



          <p className="text-xs text-muted-foreground">
            Last updated: {company.updated_at ? new Date(company.updated_at).toLocaleDateString("en-GB") : "—"} · Source:
            Department of Registrar of Companies and Intellectual Property.
          </p>
        </div>

        <aside id="order" className="h-fit space-y-4 lg:sticky lg:top-24">
          <TooltipProvider delayDuration={200}>
            {([
              {
                id: "certificates",
                title: "Order certificates",
                blurb: `Certified registrar documents for ${company.name}, delivered digitally.`,
                slugs: ORDERABLE.filter((slug) => PRODUCTS.find((p) => p.slug === slug)?.category === "certificate"),
              },
              {
                id: "reports",
                title: "Order reports",
                blurb: `Structure, credit and due diligence intelligence on ${company.name}.`,
                slugs: ORDERABLE.filter((slug) => PRODUCTS.find((p) => p.slug === slug)?.category !== "certificate"),
              },
            ] as const).filter((group) => group.slugs.length > 0).map((group) => (
            <div key={group.id} id={group.id} className="scroll-mt-24 rounded-xl border bg-card p-6 shadow-panel">
              <h2 className="font-display text-lg font-semibold">{group.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {group.blurb}
              </p>
              <ul className="mt-5 space-y-3">
                {group.slugs.map((productSlug) => {
                  const product = PRODUCTS.find((item) => item.slug === productSlug);
                  if (!product) return null;
                  return (
                    <li
                      key={product.slug}
                      className={
                        product.slug === "cyprus-company-profile"
                          ? "relative rounded-lg border-2 border-copper bg-copper/5 p-4 shadow-panel"
                          : "rounded-lg border p-4"
                      }
                    >
                      {product.slug === "cyprus-company-profile" && (
                        <span className="absolute -top-3 left-4 inline-flex items-center gap-1 rounded-full bg-copper px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-copper-foreground shadow-lg shadow-copper/30">
                          <Star className="size-3 fill-copper-foreground" />
                          Best seller
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Link
                              to="/report/$type"
                              params={{ type: product.slug }}
                              className="text-sm font-semibold hover:text-copper"
                            >
                              {product.name}
                            </Link>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={`What is ${product.name}?`}
                                  className="inline-flex items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-copper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper"
                                >
                                  <Info className="size-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[16rem]">
                                <p className="font-medium">{product.tagline}</p>
                              </TooltipContent>

                            </Tooltip>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{product.delivery}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {(() => {
                            const breakdown = priceBreakdown(product);
                            return (
                              <>
                                <span className="block text-sm font-semibold">{formatPrice(breakdown.documentPrice)}</span>
                                <span className="block text-[10px] text-muted-foreground">
                                  {product.category === "certificate"
                                    ? "certificate only"
                                    : product.category === "pack"
                                      ? "report & certificates"
                                      : "report only"}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                        <Receipt className="size-3" />
                        {(() => {
                          const breakdown = priceBreakdown(product);
                          return (
                            <>
                              {product.category === "certificate" && (
                                <span>€50 handling fee per certificate applies at checkout</span>
                              )}
                              {product.category !== "certificate" && (
                                <span>{formatPrice(breakdown.total)} incl. VAT</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <AddToCartButton
                        productSlug={product.slug}
                        companySlug={company.slug}
                        companyName={company.name}
                        companyNumber={displayOfficialNo(company)}
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
            ))}
          </TooltipProvider>

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

