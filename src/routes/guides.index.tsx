import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen } from "lucide-react";

const TITLE = "Guides — Cyprus Company Registration and Registry Research";
const DESCRIPTION =
  "Practical guides on registering a Cyprus company, understanding registry records and meeting ongoing company obligations, written for local and international founders.";
const CANONICAL = "https://companieshousecyprus.com/guides";

export const Route = createFileRoute("/guides/")({
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
  }),
  component: GuidesIndex,
});

const GUIDES = [
  {
    to: "/guides/register-company-cyprus" as const,
    title: "How to Register a Company in Cyprus: Complete 2026 Guide",
    body: "The incorporation process end to end — structures, required documents, indicative timelines, costs, tax and VAT registration, beneficial ownership, banking preparation and annual compliance.",
  },
];

function GuidesIndex() {
  return (
    <main>
      <section className="surface-deep">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
          <nav aria-label="Breadcrumb" className="text-sm text-primary-foreground/70">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span aria-current="page">Guides</span>
          </nav>
          <h1 className="mt-4 text-3xl sm:text-4xl">Guides</h1>
          <p className="mt-3 max-w-2xl text-primary-foreground/80">
            Independent, plain-English guides for founders, investors and professional advisers
            working with Cyprus companies.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12">
        <ul className="grid gap-5">
          {GUIDES.map((guide) => (
            <li key={guide.to}>
              <Link
                to={guide.to}
                className="flex flex-col rounded-xl border bg-card p-6 shadow-panel transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <BookOpen className="h-5 w-5 text-copper" aria-hidden="true" />
                <h2 className="mt-3 font-heading text-xl">{guide.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{guide.body}</p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-copper">
                  Read the guide
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
