import { createFileRoute, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getCompanyBySlug } from "@/lib/companies.functions";
import { Link } from "@tanstack/react-router";

const companyQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["company", slug],
    queryFn: () => getCompanyBySlug({ data: { slug } }),
  });

export const Route = createFileRoute("/company/$slug")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(companyQueryOptions(params.slug));
  },
  head: ({ params }) => ({
    meta: [
      { title: `Company ${params.slug} | Cyprus Companies Registry` },
      { name: "description", content: `Company profile for ${params.slug} from the Cyprus Registrar of Companies.` },
      { property: "og:title", content: `Company ${params.slug} | Cyprus Companies Registry` },
      { property: "og:description", content: `Company profile for ${params.slug} from the Cyprus Registrar of Companies.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompanyPage,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold">Company not found</h1>
      <p className="mt-4 text-muted-foreground">We could not find a company with that identifier.</p>
      <Link to="/" className="mt-6 text-primary hover:underline">Back to home</Link>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-bold">Unable to load company</h1>
      <p className="mt-4 text-muted-foreground">{error.message}</p>
      <Link to="/" className="mt-6 text-primary hover:underline">Back to home</Link>
    </div>
  ),
});

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mb-6 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        {" / "}
        <Link to="/search" className="hover:text-foreground">Search</Link>
        {" / "}
        <span className="text-foreground">{company.name}</span>
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{company.name}</h1>
      <p className="mt-2 text-muted-foreground">{company.official_no}</p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Status</h2>
          <dl className="mt-4 space-y-3">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{company.status_en ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status date</dt>
              <dd className="font-medium">{company.status_date ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">{company.type_en ?? company.type_code}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtype</dt>
              <dd className="font-medium">{company.subtype_en ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Registration number</dt>
              <dd className="font-medium">{company.reg_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Registration date</dt>
              <dd className="font-medium">{company.registration_date ?? "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Address</h2>
          <address className="mt-4 not-italic text-muted-foreground">
            {company.address_full ? (
              <p>{company.address_full}</p>
            ) : (
              <p>—</p>
            )}
            {company.district_en && (
              <p className="mt-2">
                {company.district_en}
                {company.postcode && `, ${company.postcode}`}
              </p>
            )}
          </address>
          {company.locality && (
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">Locality: </span>
              {company.locality}
            </p>
          )}
        </div>
      </div>

      {officials.length > 0 && (
        <div className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold">Officials</h2>
          <ul className="mt-4 divide-y">
            {officials.map((official, i) => (
              <li key={i} className="py-3">
                <p className="font-medium">{official.person_name}</p>
                <p className="text-sm text-muted-foreground">{official.position_en ?? official.position_el}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 text-sm text-muted-foreground">
        <p>Last updated: {company.updated_at ? new Date(company.updated_at).toLocaleDateString("en-GB") : "—"}</p>
      </div>
    </div>
  );
}
