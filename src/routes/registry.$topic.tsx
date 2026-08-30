import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildRegistryLandingHead,
  getRegistryLanding,
  REGISTRY_LANDINGS,
  registryLandingPath,
} from "@/lib/seo/registry-landings";

export const Route = createFileRoute("/registry/$topic")({
  loader: ({ params }) => {
    if (!getRegistryLanding(params.topic)) throw notFound();
    return null;
  },
  head: ({ params }) => {
    const landing = getRegistryLanding(params.topic);
    if (!landing) {
      return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    }
    return buildRegistryLandingHead(landing);
  },
  component: RegistryLandingPage,
  notFoundComponent: LandingNotFound,
});

function LandingNotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 text-muted-foreground">
        This registry page does not exist. Search the Cyprus register instead.
      </p>
      <Button asChild className="mt-6">
        <Link to="/search">Search companies</Link>
      </Button>
    </div>
  );
}

function RegistryLandingPage() {
  const { topic } = Route.useParams();
  const landing = getRegistryLanding(topic);
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  if (!landing) return <LandingNotFound />;

  const others = REGISTRY_LANDINGS.filter((item) => item.slug !== landing.slug);

  return (
    <div className="bg-background">
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">
              Home
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">{landing.label}</span>
          </nav>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{landing.h1}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {landing.intro}
          </p>

          <form
            className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const q = query.trim();
              if (!q) return;
              void navigate({ to: "/search", search: { q } });
            }}
          >
            <label className="sr-only" htmlFor="registry-landing-search">
              Search Cyprus companies
            </label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="registry-landing-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Company name or registration number"
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" className="h-11">
              Search
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div className="space-y-12">
          {landing.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-xl font-semibold tracking-tight">{section.heading}</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{section.body}</p>
              {section.bullets ? (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
          <dl className="mt-6 space-y-6">
            {landing.faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="font-medium">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14 rounded-lg border p-6">
          <h2 className="text-lg font-semibold tracking-tight">Related registry pages</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {others.map((item) => (
              <li key={item.slug}>
                <Link
                  to="/registry/$topic"
                  params={{ topic: item.slug }}
                  className="text-sm text-primary hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/cyprus-companies-registry" className="text-sm text-primary hover:underline">
                Cyprus companies registry
              </Link>
            </li>
            <li>
              <Link to="/directory" className="text-sm text-primary hover:underline">
                Company directory by registry signal
              </Link>
            </li>
          </ul>
          <p className="sr-only">{registryLandingPath(landing)}</p>
        </div>
      </section>
    </div>
  );
}
