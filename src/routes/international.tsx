import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  buildHubHead,
  INTERNATIONAL_GUIDES,
  INTERNATIONAL_HUB,
} from "@/lib/seo/international-guides";

export const Route = createFileRoute("/international")({
  head: () => buildHubHead(),
  component: InternationalHubPage,
});

function InternationalHubPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  return (
    <div className="bg-background">
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">
              {INTERNATIONAL_HUB.breadcrumb.home}
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">{INTERNATIONAL_HUB.breadcrumb.current}</span>
          </nav>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {INTERNATIONAL_HUB.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {INTERNATIONAL_HUB.intro}
          </p>

          <form
            className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const q = query.trim();
              if (!q) return;
              void navigate({ to: "/search", search: { q, page: 1 } });
            }}
          >
            <label className="sr-only" htmlFor="international-hub-search">
              Search Cyprus companies
            </label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="international-hub-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={INTERNATIONAL_HUB.searchPlaceholder}
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" className="h-11">
              {INTERNATIONAL_HUB.primaryCta}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4">
            <Link to="/pricing" className="text-sm font-medium text-primary hover:underline">
              {INTERNATIONAL_HUB.secondaryCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <h2 className="text-xl font-semibold tracking-tight">Choose your country</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          Each guide explains the Cyprus equivalent of the register you already know, what you can
          look up, and which official certificates you can order. Registry names are used for
          comparison only.
        </p>

        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {INTERNATIONAL_GUIDES.map((guide) => (
            <li key={guide.key} className="rounded-lg border p-5">
              <p className="text-2xl" aria-hidden="true">
                {guide.flag}
              </p>
              <h3 className="mt-2 text-base font-semibold" lang={guide.lang}>
                {guide.localTerm}
              </h3>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {guide.country}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{guide.hubBlurb}</p>
              <a
                href={guide.path}
                hrefLang={guide.hreflang}
                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
              >
                {INTERNATIONAL_HUB.cardCta}
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-lg border p-6">
          <h2 className="text-lg font-semibold tracking-tight">Continue on this site</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            <li>
              <Link to="/search" search={{ q: "", page: 1 }} className="text-sm text-primary hover:underline">
                Search Cyprus companies
              </Link>
            </li>
            <li>
              <Link to="/cyprus-companies-registry" className="text-sm text-primary hover:underline">
                Cyprus companies registry
              </Link>
            </li>
            <li>
              <Link to="/pricing" className="text-sm text-primary hover:underline">
                Certificates and reports pricing
              </Link>
            </li>
            <li>
              <Link to="/directory" className="text-sm text-primary hover:underline">
                Company directory by registry signal
              </Link>
            </li>
          </ul>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
          {INTERNATIONAL_HUB.disclaimer}
        </p>
      </section>
    </div>
  );
}
