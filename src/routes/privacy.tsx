import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ShieldCheck,
  Mail,
  FileText,
  Scale,
  Lock,
  Cookie,
  UserCheck,
  Globe,
} from "lucide-react";

const TITLE = "Privacy policy — Companies House Cyprus";
const DESCRIPTION =
  "How Companies House Cyprus and Infocredit Group Ltd handle personal data, cookies, your rights under GDPR and the sources of information we use.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

const RIGHTS = [
  {
    title: "I. Transparent information",
    text: "You have the right to be provided with your data freely and in an intelligible and easily accessible form. Following your request, Infocredit shall provide information without undue delay and in any event within one month of receipt of the request. That period may be extended by two further months where necessary, taking into account the complexity and number of requests. Infocredit will inform you of the reasons for any delay.",
  },
  {
    title: "II. Information where data is collected from you",
    text: "You have the right to know the contact details of the data controller, the contact details of the Data Protection Officer, the purposes of processing, the legal basis for processing, the recipients or categories of recipients of the personal data, and where applicable the fact that the controller intends to transfer personal data to a third country.",
  },
  {
    title: "III. Right of access",
    text: "You have the right to request and receive a copy of your personal data undergoing processing. For any further copies requested, Infocredit may charge a reasonable fee based on administrative costs.",
  },
  {
    title: "IV. Right to rectification",
    text: "You have the right to obtain from Infocredit without undue delay the rectification of inaccurate personal data concerning you. Note that we cannot amend the public register itself; corrections to a company record must be filed with the Registrar, after which our copy is updated.",
  },
  {
    title: "V. Right to erasure ('right to be forgotten')",
    text: "You may ask for the erasure of your personal data where it is no longer necessary for the purposes for which it was collected. Where Infocredit retains and processes personal data to comply with a legal obligation, we may object to such a request and keep the data required to comply with that obligation.",
  },
  {
    title: "VI. Right to restriction of processing",
    text: "You have the right to restrict processing where the accuracy of your data is contested, where the processing is unlawful, or where there is pending verification as to whether the legitimate grounds of Infocredit override your rights. For data necessary to comply with a legal obligation, Infocredit may object to the restriction.",
  },
  {
    title: "VII. Right to data portability",
    text: "You have the right to receive the personal data you have provided to Infocredit in a structured, commonly used and machine-readable format, and to transmit those data to another controller without hindrance.",
  },
  {
    title: "VIII. Right to object",
    text: "You have the right to object to the processing of your personal data. Because Infocredit lawfully processes such data under Article 6(1)(c) of the GDPR for compliance with legal obligations or under Article 6(1)(f) for legitimate interests, the right to object may be limited where the processing remains necessary.",
  },
  {
    title: "IX. Automated decision-making and profiling",
    text: "You have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning you or similarly significantly affects you.",
  },
];

function PrivacyPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero */}
      <div className="relative bg-primary py-14 text-primary-foreground">
        <div className="absolute inset-0 grid-dots opacity-20" />
        <div className="absolute -right-20 -top-20 size-80 rounded-full bg-copper/25 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-primary-glow/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-copper">
            <ShieldCheck className="size-4" />
            <span>Privacy</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 max-w-2xl text-sm/6 text-primary-foreground/80">
            Infocredit Group Ltd is committed to ensuring that your privacy is
            protected. This policy explains how we use the information we collect,
            how you can instruct us to limit its use, and the safeguards we have in
            place.
          </p>
          <p className="mt-4 text-xs text-primary-foreground/60">
            Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Content */}
      <article className="mx-auto max-w-3xl px-4 py-14">
        <div className="prose prose-sm max-w-none text-muted-foreground">
          <section className="scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <UserCheck className="size-5 text-copper" />
              1. The information we collect and how we use it
            </h2>
            <div className="mt-3 space-y-4 leading-7">
              <p>
                When you register for any of our services, we may require details including:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Last name and first name</li>
                <li>Company name and your position</li>
                <li>VAT number</li>
                <li>Address details</li>
                <li>Telephone and fax numbers</li>
                <li>Email address</li>
              </ul>
              <p>
                We gather this information to allow us to process your registrations and
                any orders you make through our websites. The relevant information is used
                by us to communicate with you on any matter relating to the conduct of your
                account and the provision of our services in general.
              </p>
              <p>
                We may also use aggregate information and statistics for the purposes of
                monitoring website usage in order to help us develop the website, and we may
                provide such aggregate information to third parties. These statistics will
                not include any information that can be used to identify any individual.
              </p>
              <p>
                We may also wish to provide you with information about special features of our
                website or any other service or products we think may be of interest to you.
                If you would rather not receive this information, please send an email message to{" "}
                <a
                  href="mailto:info@infocreditgroup.com"
                  className="font-medium text-copper hover:underline"
                >
                  info@infocreditgroup.com
                </a>.
              </p>
              <p>
                We may automatically collect technical information when you connect to our
                site that is not personally identifiable. This includes, for example, the type
                of Internet browser you are using, the type of computer operating system and
                the domain name of the website from which you are linked to our site.
              </p>
              <p>
                Within the scope of the provision of our services to our clients, we will come
                across personal data of individuals who are usually the subject matter of the
                service we offer to our clients. Through this statement, we inform those
                individuals that their data will be collected and processed for the purpose of
                executing our obligation to our clients. This data will be safely processed and
                stored, and the data subjects have the same rights as all other individuals whose
                data we process as described in Section 7.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Globe className="size-5 text-copper" />
              2. For which purposes do we collect personal data?
            </h2>
            <div className="mt-3 space-y-4 leading-7">
              <p>
                Except for cases where we provide services directly to you, Infocredit Group
                Ltd processes data so that it can supply commercial data about organisations to
                other organisations. The purpose of this processing is to enable businesses to
                manage their financial risks, protect against fraud, know who they are doing
                business with, meet compliance and regulatory obligations, and better understand
                organisations, industries and markets.
              </p>
              <p>
                Consequently, we collect information on businesses and other relevant
                information in order to assess risk. This information includes, for example:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Registration details (registered name, registered address, registration number, etc.)</li>
                <li>Director, secretary and shareholder information (name, surname, identity card / passport / ARC number and issuing country, address, occupation, nationality, date of birth, date of appointment, information on shares held, position held)</li>
                <li>Capital (issued, number of shares, nominal value, etc.)</li>
                <li>Payment records and charges (current and historic)</li>
                <li>Negative information and bankruptcies of the entity and related legal entities</li>
                <li>Financial statements (when available)</li>
                <li>Credit scoring assessment based on financial and non-financial variables</li>
                <li>Company operational histories, subsidiaries, affiliates, and lines of business</li>
                <li>Business compliance information from public-source government and professional records, media and business publications</li>
                <li>Newspaper and media reports of criminal convictions</li>
                <li>Bankruptcy information as retrieved from the Official Receiver</li>
              </ul>
              <p>
                Infocredit does not seek to collect any information in relation to a European
                resident’s race or ethnic origin, political opinions, religious or philosophical
                beliefs, trade union membership, health, sex life or sexual orientation, genetic
                or biometric data.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <FileText className="size-5 text-copper" />
              3. Our data sources
            </h2>
            <div className="mt-3 leading-7">
              <p>Our data originates from public and other sources, including:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Public sector information (e.g. company registrars and the Official Receiver)</li>
                <li>Governmental and administrative public records such as business registrations, company filings, court and bankruptcy filings</li>
                <li>Organisations providing information directly to us</li>
                <li>Creditors and suppliers of an organisation</li>
                <li>Regulatory bodies and law enforcement agencies</li>
                <li>Media sources</li>
              </ul>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Lock className="size-5 text-copper" />
              4. Why do our clients request data from us?
            </h2>
            <div className="mt-3 space-y-4 leading-7">
              <h3 className="font-display text-sm font-semibold text-foreground">
                4.1 Credit risk management and assessment
              </h3>
              <p>
                Credit risk management is the practice of determining creditworthiness — assessing
                new and existing customers for their financial health, which can indicate their
                ability to pay on time. It is important that suppliers perform due diligence to
                manage the risks that come with extending business credit.
              </p>
              <h3 className="font-display text-sm font-semibold text-foreground">
                4.2 Anti-money laundering information for prospective clients
              </h3>
              <p>
                In Cyprus and the other jurisdictions in which we operate, laws and regulations are
                designed to combat money laundering. Broadly, money laundering can arise if a person
                acquires, retains, transfers, uses or controls the proceeds of a crime or the benefit
                of a criminal activity. References to money laundering include references to terrorism.
              </p>
              <p>
                In order to fulfil their obligations, our clients are obliged to verify the identity
                of new clients, and in certain circumstances existing clients. Their internal
                requirements may also require background checks on new or existing clients. These may
                necessitate verification of the identity and good standing of clients, one or more of
                their directors, employees or other representatives, and shareholders, beneficial
                owners, management, directors or officers, and possibly including evidence of the
                source of funds. In these cases we may request copies of evidence of identity from our
                client to assist in fulfilling the investigation.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <UserCheck className="size-5 text-copper" />
              5. Who do we share this information with?
            </h2>
            <div className="mt-3 leading-7">
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-foreground">Customers</strong> — businesses and organisations with whom we enter into agreements to licence or access our data. Our customers enter into agreements or licences because they wish to manage their financial risks, protect against fraud, know who they are doing business with, meet compliance and regulatory obligations, better understand organisations, industries and markets, or carry out direct marketing.
                </li>
                <li>
                  <strong className="text-foreground">Resellers</strong> — we licence information to authorised resellers and third-party businesses for reselling.
                </li>
              </ul>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Scale className="size-5 text-copper" />
              6. Grounds of processing
            </h2>
            <div className="mt-3 leading-7">
              <p>
                In legal terms we process personal data under the ground of “legitimate interest” and
                “third party legitimate interest”. Infocredit’s legitimate business interest is the
                supply of commercial data. The purpose of this processing is to enable businesses to
                manage their financial risks, protect against fraud, know who they are doing business
                with, meet compliance and regulatory obligations, and better understand organisations,
                industries and markets.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Cookie className="size-5 text-copper" />
              7. Our use of cookies
            </h2>
            <div className="mt-3 leading-7">
              <p>
                When you view one of our websites, we may store information on your computer. This
                information will be in the form of a “cookie” or similar file and can help us in many
                ways. For example, cookies allow us to tailor our website to better match your
                interests and preferences. With most Internet browsers, you can erase cookies from
                your computer hard drive, block all cookies or receive a warning before a cookie is
                stored. Please refer to your browser instructions or help screen to learn more about
                these functions.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="font-display text-lg font-semibold text-foreground">
              8. Updating your details
            </h2>
            <div className="mt-3 leading-7">
              <p>
                If you believe that any information provided to us or included in our database is not
                up to date, please contact us at{" "}
                <a
                  href="mailto:info@infocreditgroup.com"
                  className="font-medium text-copper hover:underline"
                >
                  info@infocreditgroup.com
                </a>{" "}
                in order to proceed with an update.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="font-display text-lg font-semibold text-foreground">
              9. Your consent
            </h2>
            <div className="mt-3 leading-7">
              <p>
                In case information is provided to us directly by you through our webpage with the
                submission of your information, you consent to the use of that information as set
                out in this policy. If we change our privacy policy we will post the changes on
                this page so that you may be aware of the information we collect and how we use it at
                all times. Continued use of the service will signify that you agree to any such
                changes.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="font-display text-lg font-semibold text-foreground">
              10. Events registration
            </h2>
            <div className="mt-3 leading-7">
              <p>
                To register as a delegate for an event you must complete a registration form. During
                registration you are required to give your contact information (such as name, address,
                phone number and email address). This information enables us to process and fulfil your
                enrolment online so that we can contact you about the events for which you have
                expressed interest. Optionally, you may provide demographic information (such as company
                name and position). If you do provide such information, we are able to use it to provide
                a more personalised experience on our website.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="font-display text-lg font-semibold text-foreground">
              11. Your reinforced rights
            </h2>
            <div className="mt-3 leading-7">
              <p>
                Infocredit has taken appropriate measures to provide any information relating to your
                rights as well as the exercise of these rights. Under Chapter III of the GDPR you have
                the following rights:
              </p>
              <div className="mt-4 space-y-4">
                {RIGHTS.map((right) => (
                  <div
                    key={right.title}
                    className="rounded-xl border bg-card p-4 transition-colors hover:border-copper/30"
                  >
                    <h3 className="font-display text-sm font-semibold text-foreground">
                      {right.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed">{right.text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4">
                You can exercise your reinforced rights by contacting us at{" "}
                <a
                  href="mailto:info@infocreditgroup.com"
                  className="font-medium text-copper hover:underline"
                >
                  info@infocreditgroup.com
                </a>.
              </p>
            </div>
          </section>

          <section className="mt-10 scroll-mt-24">
            <h2 className="font-display text-lg font-semibold text-foreground">
              12. Data protection responsibilities
            </h2>
            <div className="mt-3 leading-7">
              <p>
                We process and store all personal data in line with EU Data Protection Legislation.
                Personal data is utilised for registration purposes only and is not sold or forwarded
                to any third parties without your consent.
              </p>
              <p className="mt-4">
                For the purposes of this Privacy Policy we act as “data controllers” when we determine
                the purposes for which and the manner in which any personal data are, or are to be,
                processed. Furthermore, we act as “data processors” when we obtain, record or hold the
                information or data, or carry out any operation or set of operations on the information
                or data.
              </p>
              <p className="mt-4">
                For any further information you need with regard to Data Protection, please contact our
                Data Protection Officer:
              </p>
              <div className="mt-4 rounded-xl border bg-card p-5">
                <p className="font-medium text-foreground">A. & E. C. Emilianides, C. Katsaros & Associates LLC</p>
                <p className="mt-1 text-sm">192 Ledras, 3rd Floor</p>
                <p className="text-sm">1011 Nicosia, Cyprus</p>
                <p className="mt-2 text-sm">
                  Tel: <a href="tel:+35722676752" className="text-copper hover:underline">+357 22 676752</a>
                </p>
                <p className="text-sm">
                  Fax: <span className="text-muted-foreground">+357 22 676754</span>
                </p>
                <p className="mt-2 text-sm">
                  Email:{" "}
                  <a href="mailto:DPO@infocreditgroup.com" className="font-medium text-copper hover:underline">
                    DPO@infocreditgroup.com
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Related cards */}
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          <Link
            to="/terms"
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all hover:border-copper/40 hover:shadow-panel"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scale className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-copper">
                Terms of service
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                The terms governing use of this directory and our reports.
              </p>
            </div>
          </Link>

          <a
            href="mailto:info@infocreditgroup.com"
            className="group flex items-start gap-4 rounded-xl border bg-card p-5 transition-all hover:border-copper/40 hover:shadow-panel"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="size-5" />
            </div>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-copper">
                Contact us
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                info@infocreditgroup.com
              </p>
            </div>
          </a>
        </div>
      </article>
    </div>
  );
}
