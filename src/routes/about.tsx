import { createFileRoute, Link } from "@tanstack/react-router";
import { Database, Globe2, ShieldCheck, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLE = "About Companies House Cyprus — the open Cyprus company register";
const DESCRIPTION =
  "We publish the full Cyprus company register — 571,000+ entities — and deliver Registrar certificates and company intelligence to law firms, banks and corporate service providers.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/about" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const PILLARS = [
  {
    icon: Database,
    title: "The complete register",
    body: "Every company, partnership and overseas branch on the Cyprus register — 571,218 entities with status, officials & owners, address and filing history.",
  },
  {
    icon: ShieldCheck,
    title: "Registrar-sourced only",
    body: "Certificates are issued by the Department of Registrar of Companies and Intellectual Property. We never synthesise or estimate an official record.",
  },
  {
    icon: Timer,
    title: "Built for turnaround",
    body: "Profiles are delivered the same business day; Registrar certificates in one to two business days, with apostille and translation on request.",
  },
  {
    icon: Globe2,
    title: "Cross-border ready",
    body: "Documents are prepared for use abroad — banks, foreign registries, notaries and tender authorities accept them as filed.",
  },
];

function AboutPage() {
  return (
    <div>
      <section className="surface-deep grid-dots">
        <div className="mx-auto max-w-7xl px-4 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-copper">About us</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold md:text-5xl">
            The Cyprus register, made searchable — and actionable.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/75">
            Companies House Cyprus exists because finding a Cyprus company should not require insider knowledge of the
            Registrar's systems. We publish the whole register openly, and turn any entry into a certified document.
          </p>
          <dl className="mt-12 grid gap-8 border-t border-white/15 pt-8 sm:grid-cols-3">
            {[
              ["571,218", "Entities on the register"],
              ["6", "Districts covered"],
              ["1–2 days", "Certificate turnaround"],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-3xl font-bold text-copper">{value}</dt>
                <dd className="mt-1 text-sm text-primary-foreground/70">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-16">
        <section className="grid gap-6 md:grid-cols-2">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="rounded-xl border bg-card p-7 shadow-panel">
              <pillar.icon className="size-6 text-copper" />
              <h2 className="mt-4 font-display text-lg font-semibold">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="text-2xl font-semibold">Who we work with</h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Corporate service providers running client onboarding, law firms preparing transaction files, banks and
              payment institutions performing KYB, and procurement teams verifying bidders. The common need is the
              same: an authoritative record of a Cyprus entity, in a form a third party will accept.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The public directory stays free. Certificates, consolidated profiles and credit reports are priced per
              document with no subscription, so occasional users pay the same fair rate as high-volume accounts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/pricing">See pricing</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-sand p-7">
            <h2 className="font-display text-lg font-semibold">Data & sources</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>Department of Registrar of Companies and Intellectual Property (RoC) — organisation, officials and registered office files.</li>
              <li>Records are refreshed from the official registrar exports; each company page shows its last update.</li>
              <li>We are an independent service and are not affiliated with the Government of the Republic of Cyprus.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
