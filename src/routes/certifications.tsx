import { createFileRoute } from "@tanstack/react-router";
import { Award, ShieldCheck, Clock, FileCheck } from "lucide-react";
import iso9001Asset from "@/assets/eurocert-iso-9001.png.asset.json";
import iso27001Asset from "@/assets/eurocert-iso-27001.png.asset.json";
import iso22301Asset from "@/assets/eurocert-iso-22301.png.asset.json";

const TITLE = "Certifications — Companies House Cyprus";
const DESCRIPTION =
  "EUROCERT-certified management systems: ISO 9001:2015 Quality, ISO 22301:2019 Business Continuity and ISO/IEC 27001 Information Security.";

export const Route = createFileRoute("/certifications")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/certifications" }],
  }),
  component: CertificationsPage,
});

const CERTIFICATIONS = [
  {
    icon: Award,
    badge: iso9001Asset,
    standard: "ISO 9001:2015",
    title: "Quality Management System",
    body: "At the heart of our management operations and processes is our ISO 9001 Quality Management Systems (QMS) commitment. This means that all business processes within our organization are documented and subject to quality oversight processes from our internal quality management team, all staff and relevant external partners and stakeholders.",
    alt: "EUROCERT certified management system — ISO 9001:2015",
  },
  {
    icon: Clock,
    badge: iso22301Asset,
    standard: "ISO 22301:2019",
    title: "Business Continuity Management System",
    body: "The COVID Pandemic as well as other risks in an increasingly global world make it necessary for us to have a continuity plan in place in case something affects our core place of business. We have become certified according to the ISO 22301 standard as a testament to our commitment of continuing to serve our customers even if some major disaster were to affect our key staff, headquarters or other aspect of operations.",
    alt: "EUROCERT certified management system — ISO 22301:2019",
  },
  {
    icon: ShieldCheck,
    badge: iso27001Asset,
    standard: "ISO/IEC 27001",
    title: "Information Security Management System",
    body: "Given our operations in credit information, credit scoring and other KYC/due diligence, it is important that our own information security standards are robust enough to safeguard confidential data. We have been certified for information security management systems and strictly follow all measures needed to assure information security.",
    alt: "EUROCERT certified management system — ISO/IEC 27001",
  },
];

const WHY_IT_MATTERS = [
  {
    icon: FileCheck,
    title: "Documented processes",
    text: "Every workflow that touches your order, your data or your documents is written, reviewed and maintained under our QMS.",
  },
  {
    icon: ShieldCheck,
    title: "Confidentiality by design",
    text: "Our ISMS controls cover access, transmission, storage and disposal of sensitive information — including company and personal data.",
  },
  {
    icon: Clock,
    title: "Resilient service",
    text: "BCMS plans mean we can keep issuing certificates and answering requests even if key systems or locations are disrupted.",
  },
];

function CertificationsPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-primary py-14 text-primary-foreground">
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-copper/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-copper">
            <Award className="size-4" />
            <span>Certifications</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Independently audited management systems
          </h1>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            Our operations are certified by EUROCERT for quality, business continuity and information
            security. These certifications reflect how we run the business that serves your company
            intelligence and certificate orders.
          </p>
        </div>
      </div>

      {/* Certification cards */}
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="grid gap-8">
          {CERTIFICATIONS.map((cert) => (
            <article
              key={cert.standard}
              className="overflow-hidden rounded-xl border bg-card shadow-panel"
            >
              <div className="grid gap-6 p-6 sm:grid-cols-[140px_1fr] sm:items-start sm:p-8">
                <div className="flex items-center justify-center rounded-lg bg-sand p-4">
                  <img
                    src={cert.badge.url}
                    alt={cert.alt}
                    className="h-auto w-full max-w-[120px]"
                    loading="lazy"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-copper">
                    <cert.icon className="size-4" />
                    <span>{cert.standard}</span>
                  </div>
                  <h2 className="mt-2 font-display text-xl font-semibold sm:text-2xl">
                    {cert.title}
                  </h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{cert.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Why it matters */}
        <section className="mt-16">
          <h2 className="text-center font-display text-2xl font-semibold">What this means for you</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground">
            Certification is not a one-time event. External auditors review our systems regularly, so the
            controls you rely on today are tested and refreshed.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {WHY_IT_MATTERS.map((item) => (
              <div key={item.title} className="rounded-xl border bg-sand p-6">
                <item.icon className="size-6 text-copper" />
                <h3 className="mt-4 font-display text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer note */}
        <p className="mt-12 text-center text-xs text-muted-foreground">
          All management-system certificates are issued by EUROCERT and available on request.
        </p>
      </div>
    </div>
  );
}
