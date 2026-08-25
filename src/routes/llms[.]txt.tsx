import { createFileRoute } from "@tanstack/react-router";
import { getRegistryStats } from "@/lib/companies.functions";
import { formatEntityCount, hasEntityCount } from "@/lib/registry-stats";

/**
 * llms.txt — A machine-readable guide to Companies House Cyprus for LLMs and AI agents.
 *
 * Format follows the llms.txt convention: a concise plain-text overview plus
 * key URLs and API endpoints that ChatGPT, Claude, Perplexity and other AI
 * crawlers can use to answer questions about Cyprus companies accurately.
 */
export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: async () => {
        // Coverage figure comes from the central registry statistics source so the
        // machine-readable guide never advertises a stale hard-coded number.
        const stats = await getRegistryStats();
        const coverage = hasEntityCount(stats.count)
          ? `${formatEntityCount(stats.count)} entities`
          : "Cyprus-registered entities";
        const body = `# Companies House Cyprus — LLM guide

> Search and browse the official Cyprus Registrar of Companies. Free public search; paid certificates, company profiles, KYB and credit reports delivered digitally.

## About

Companies House Cyprus (https://companieshousecyprus.com) is an unofficial but authoritative directory of entities registered with the Department of Registrar of Companies and Official Receiver of the Republic of Cyprus. The site indexes companies, partnerships and business names across all six districts and exposes official registry fields including registration number, registration date, status, registered office address, directors/secretaries and owners.

## Key facts

- Base URL: https://companieshousecyprus.com
- Language: English (company names and registry data), Greek addresses transliterated to Latin where available
- Coverage: ${coverage} from the Cyprus Registrar of Companies
- Data source: Official Registrar of Companies records, refreshed through administrative imports and API4ALL integrations
- Contact: info@companieshousecyprus.com | +357 22 398241
- Physical office: 1 Agiou Andreou Street, Limassol 3036, Cyprus

## Public pages

- Home / search: https://companieshousecyprus.com/
- Company search results: https://companieshousecyprus.com/search?q={query}&page=1
- Company profile: https://companieshousecyprus.com/company/{slug}
- Browse A–Z: https://companieshousecyprus.com/companies/a-z/{letter}
- Products & pricing: https://companieshousecyprus.com/pricing
- Contact: https://companieshousecyprus.com/contact
- KYB for banks: https://companieshousecyprus.com/solutions/kyb-for-banks

## Public JSON API

- Company lookup by registration number or slug:
  POST https://companieshousecyprus.com/api/public/company-lookup
  Content-Type: application/json
  Body: { "q": "HE 252407" } or { "q": "softbot-ltd-c1e2d3" }
  Returns: company profile, officials/owners, status, address, age and profile URL.

## Products

- Cyprus Company Profile (Structure Report) — €40
- Cyprus Credit Report — €40
- Certificate of Good Standing — €40
- Certificate of Incorporation — €40
- Certificate of Directors and Secretary — €40
- Certificate of Shareholders — €40
- Certificate of Registered Office — €40
- Memorandum and Articles of Association — €70
- KYB & Due Diligence Pack — €185
- Tender & Bid Pack — €40
- Due Diligence Report — €750

All certificate orders incur a €50 service/handling fee. VAT (19%) applies to reports and service fees only, not to certificates themselves. Prices shown are public list prices; registered clients see final totals at checkout.

## Data model for companies

- name: registered company name
- official_no / reg_number: Cyprus registration number, e.g. "HE 252407" or "C 4404"
- type_code / type_en: entity type, e.g. "Limited Company", "Partnership", "Business Name"
- status_en / status_group: current registry status, e.g. "Active", "Strike off", "Dissolved"
- registration_date: ISO date of first registration
- address_full: registered office address (Greek source with Latin transliteration)
- district_en, locality, postcode
- officials: array of persons with position_en (Director, Secretary, Owner, etc.)

## Important caveats

- Business names and some partnership records show an "Owner" section instead of directors; names are masked on public profiles and revealed only in purchased Structure/Profile reports.
- The site is not the official government portal; it is a commercial information service that sources data from the Registrar.
- For official filings, users should contact the Department of Registrar of Companies directly.

## AI crawler policy

See https://companieshousecyprus.com/ai.txt for the machine-readable crawler policy.
`;
        return new Response(body, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "x-robots-tag": "all",
          },
        });
      },
    },
  },
});
