import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Hash, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE = "How to Look Up a Cyprus Company by HE Number (Step-by-Step Guide)";
const DESCRIPTION =
  "Find any Cyprus company in seconds with its HE registration number. Learn what HE, ΗΕ and other prefixes mean, where to find the number, and how to run a free HE number lookup on the Cyprus register.";
const CANONICAL = "https://companieshousecyprus.com/guides/cyprus-he-number-lookup";

const STEPS = [
  {
    title: "Get the company's HE number",
    body: "Every Cyprus private company limited by shares is issued a registration number starting with the letters HE (Greek: ΗΕ) at incorporation. You will find it on the certificate of incorporation, official Registrar certificates, company letters and invoices, and filings submitted to the Registrar. Partnerships and overseas companies use other prefixes — see the table below.",
  },
  {
    title: "Open the registry search",
    body: "Go to the Companies House Cyprus search page. No account and no payment is required to search the register.",
    link: { to: "/search" as const, label: "Open free search" },
  },
  {
    title: "Enter the number exactly as issued",
    body: "Type the full number including the prefix, for example HE4404 or HE 4404. Spaces between the prefix and digits are ignored, and you can search in Latin or Greek characters (ΗΕ4404 works the same as HE4404). Matching is prefix-insensitive only in case, so include the letters — the digits alone may match several entity types.",
  },
  {
    title: "Open the company profile",
    body: "An HE number identifies exactly one entity, so the result list will normally contain a single match. Click the company name to open its free profile: registered name, HE number, incorporation date, current registry status, entity type and registered office district.",
  },
  {
    title: "Order official evidence if you need it",
    body: "The free profile confirms the record. For evidence acceptable to banks, courts and foreign authorities — certificates of good standing, directors and secretary, registered office, or a full structure report — order from the profile page and documents are delivered digitally.",
  },
];

const PREFIXES = [
  { prefix: "HE (ΗΕ)", meaning: "Private company limited by shares — the most common Cyprus company" },
  { prefix: "HC", meaning: "Company limited by guarantee" },
  { prefix: "HF", meaning: "Public company limited by shares" },
  { prefix: "AE", meaning: "Overseas (foreign) company registered in Cyprus" },
  { prefix: "S / Σ", meaning: "General or limited partnership" },
  { prefix: "BE", meaning: "Business (trade) name" },
  { prefix: "EE / LE", meaning: "European economic interest grouping / European company (SE)" },
];

export const Route = createFileRoute("/guides/cyprus-he-number-lookup")({
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
          "@type": "HowTo",
          name: "How to look up a Cyprus company by HE number",
          description: DESCRIPTION,
          totalTime: "PT2M",
          step: STEPS.map((step, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            name: step.title,
            text: step.body,
          })),
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://companieshousecyprus.com/" },
            { "@type": "ListItem", position: 2, name: "Guides", item: "https://companieshousecyprus.com/guides" },
            { "@type": "ListItem", position: 3, name: "HE number lookup", item: CANONICAL },
          ],
        }),
      },
    ],
  }),
  component: HeNumberLookupGuide,
});

function HeNumberLookupGuide() {
  return (
    <main>
      <section className="surface-deep">
        <div className="mx-auto max-w-4xl px-4 py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link to="/guides" className="hover:underline">
              Guides
            </Link>
            <span className="mx-2">/</span>
            <span aria-current="page">HE number lookup</span>
          </nav>
          <h1 className="mt-4 text-3xl sm:text-4xl">
            How to look up a Cyprus company by HE number
          </h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">
            The HE number is the fastest, most precise way to find a Cyprus company. This
            two-minute guide shows where to find it, what the prefixes mean, and how to run the
            lookup free of charge.
          </p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link to="/search">
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                Run a free HE number lookup
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12">
        <section>
          <h2 className="flex items-center gap-2 font-heading text-2xl">
            <Hash className="h-5 w-5 text-copper" aria-hidden="true" />
            What an HE number is
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            The Department of Registrar of Companies and Intellectual Property assigns every
            entity a unique registration number at incorporation. Private companies limited by
            shares — the standard Cyprus company — receive a number prefixed <strong>HE</strong>{" "}
            (from the Greek ΗΕ). The number never changes over the life of the company, even if
            the company changes name, so it is the most reliable identifier for due diligence.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-2xl">The lookup, step by step</h2>
          <ol className="mt-5 space-y-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-lg border bg-card p-5">
                <h3 className="font-heading text-lg">
                  <span className="mr-2 text-copper">{i + 1}.</span>
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                {step.link ? (
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <Link to={step.link.to}>
                      {step.link.label}
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="font-heading text-2xl">Cyprus registration number prefixes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Not every entity is an HE. The prefix tells you the entity type before you open the
            profile.
          </p>
          <div className="mt-4 overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-2.5 font-medium">Prefix</th>
                  <th className="px-4 py-2.5 font-medium">Entity type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {PREFIXES.map((row) => (
                  <tr key={row.prefix}>
                    <td className="px-4 py-2.5 font-medium">{row.prefix}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 font-heading text-2xl">
            <ShieldCheck className="h-5 w-5 text-copper" aria-hidden="true" />
            If the number does not match anything
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-muted-foreground">
            <li>Check for transposed digits — handwritten numbers are a common source of errors.</li>
            <li>
              Try searching the company name instead, in English or Greek; the register matches
              both scripts.
            </li>
            <li>
              A company that has been struck off or dissolved still appears in search with its
              historical record and current status.
            </li>
            <li>
              Very recent incorporations may take a short time to appear while the Registrar's
              monthly data refresh is processed.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-6">
          <h2 className="font-heading text-2xl">Keep reading</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link to="/cyprus-corporate-registry">Cyprus corporate registry</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/guides/companies-house-cyprus">Companies House Cyprus explained</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/guides">All guides</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
