import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, FileText, Search, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INTERNATIONAL_GUIDES,
  type InternationalGuide,
} from "@/lib/seo/international-guides";

export function InternationalGuidePage({ guide }: { guide: InternationalGuide }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const others = INTERNATIONAL_GUIDES.filter((item) => item.key !== guide.key);
  const inputId = `international-search-${guide.key}`;

  return (
    <div className="bg-background" lang={guide.lang}>
      <section className="border-b bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link to="/" className="hover:underline">
              {guide.breadcrumb.home}
            </Link>
            <span className="px-2">/</span>
            <Link to="/international" className="hover:underline">
              {guide.breadcrumb.hub}
            </Link>
            <span className="px-2">/</span>
            <span className="text-foreground">{guide.breadcrumb.current}</span>
          </nav>

          <p className="mt-6 text-sm font-medium text-copper">
            <span aria-hidden="true">{guide.flag}</span> {guide.localTerm}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{guide.h1}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{guide.hero}</p>

          <form
            className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              const q = query.trim();
              if (!q) return;
              void navigate({ to: "/search", search: { q, page: 1 } });
            }}
          >
            <label className="sr-only" htmlFor={inputId}>
              {guide.searchLabel}
            </label>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id={inputId}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={guide.searchPlaceholder}
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" className="h-11">
              {guide.ctaSearch}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="mt-4">
            <Link to="/pricing" className="text-sm font-medium text-primary hover:underline">
              {guide.ctaOrder}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{guide.compare.heading}</h2>
          {guide.compare.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="mt-3 leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">{guide.info.heading}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{guide.info.body}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {guide.info.items.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">{guide.docs.heading}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{guide.docs.body}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {guide.docs.items.map((doc) => (
              <li key={doc.slug} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
                  <div>
                    <p className="text-sm font-medium">{doc.label}</p>
                    <Link
                      to="/report/$type"
                      params={{ type: doc.slug }}
                      className="mt-1 inline-block text-sm text-primary hover:underline"
                    >
                      {guide.docs.orderLabel}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg border bg-muted/30 p-5">
            <div className="flex items-start gap-3">
              <Stamp className="mt-0.5 h-4 w-4 shrink-0 text-copper" />
              <div>
                <h3 className="text-sm font-semibold">{guide.docs.supportHeading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {guide.docs.supportBody}
                </p>
                <Link to="/contact" className="mt-2 inline-block text-sm text-primary hover:underline">
                  {guide.docs.supportCta}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">{guide.useCases.heading}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {guide.useCases.items.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-12">
          <h2 className="text-xl font-semibold tracking-tight">{guide.legalise.heading}</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">{guide.legalise.body}</p>
          <Link to="/contact" className="mt-3 inline-block text-sm text-primary hover:underline">
            {guide.legalise.cta}
          </Link>
        </div>

        <div className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight">{guide.faq.heading}</h2>
          <dl className="mt-6 space-y-6">
            {guide.faq.items.map((faq) => (
              <div key={faq.question}>
                <dt className="font-medium">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14 rounded-lg border bg-muted/30 p-6">
          <h2 className="text-lg font-semibold tracking-tight">{guide.finalCta.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.finalCta.body}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/search" search={{ q: "", page: 1 }}>{guide.finalCta.primary}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/pricing">{guide.finalCta.secondary}</Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 rounded-lg border p-6">
          <h2 className="text-lg font-semibold tracking-tight">{guide.relatedHeading}</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {others.map((item) => (
              <li key={item.key}>
                <a href={item.path} className="text-sm text-primary hover:underline">
                  <span aria-hidden="true">{item.flag}</span> {item.localTerm}
                </a>
              </li>
            ))}
            <li>
              <Link to="/international" className="text-sm text-primary hover:underline">
                {guide.hubLinkLabel}
              </Link>
            </li>
            <li>
              <Link to="/cyprus-companies-registry" className="text-sm text-primary hover:underline">
                Cyprus companies registry
              </Link>
            </li>
          </ul>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{guide.disclaimer}</p>
      </section>
    </div>
  );
}
