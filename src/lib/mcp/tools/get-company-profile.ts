import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getCompanyBySlug, searchCompanies } from "@/lib/companies.functions";
import { companyAge, displayOfficialNo, formatDate, isBusinessName, latinAddress } from "@/lib/format";
import { companyCanonicalSlug } from "@/lib/slug";

const BASE_URL = "https://companieshousecyprus.com";

export default defineTool({
  name: "get_company_profile",
  title: "Get Cyprus company profile",
  description:
    "Return the full public registry profile for one Cyprus company: registration number, type, status, registration date, company age, address in Greek and transliterated Latin script, and listed officials. Accepts a registration number ('HE 252407', 'C 4404'), a profile slug, or an exact-ish company name.",
  inputSchema: {
    identifier: z
      .string()
      .describe("Registration number, profile slug, or company name to resolve."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ identifier }) => {
    const raw = identifier.trim();
    if (!raw) throw new ToolError("identifier must not be empty");

    const compact = raw.toUpperCase().replace(/\s+/g, "");
    const candidates: string[] = [];
    if (/^[A-Z]{0,2}\d{1,7}$/.test(compact)) {
      const digits = compact.replace(/\D/g, "");
      const prefix = compact.replace(/\d/g, "");
      if (prefix) candidates.push(`${prefix.toLowerCase()}${digits}`);
      for (const p of ["he", "c", "p", "s", "bn", "ee", "ae", ""]) candidates.push(`${p}${digits}`);
    } else {
      candidates.push(raw.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }

    for (const slug of candidates) {
      if (!slug) continue;
      try {
        const found = await getCompanyBySlug({ data: { slug } });
        if (found?.company) return respond(found);
      } catch {
        // try next candidate
      }
    }

    const search = await searchCompanies({ data: { q: raw, page: 1 } });
    const first = search.rows[0];
    if (!first) throw new ToolError(`No Cyprus company found for "${raw}"`);
    const found = await getCompanyBySlug({ data: { slug: first.slug } });
    return respond(found);
  },
});

function respond(result: Awaited<ReturnType<typeof getCompanyBySlug>>) {
  const { company, officials } = result;
  const age = companyAge(company.registration_date);
  const officialsLabel = isBusinessName(company) ? "owner" : "officer";

  const payload = {
    name: company.name,
    registration_number: displayOfficialNo(company),
    type: company.type_en,
    subtype: company.subtype_en,
    status: company.status_en,
    status_group: company.status_group,
    status_date: formatDate(company.status_date),
    registration_date: formatDate(company.registration_date),
    company_age: age ? { years: age.years, months: age.months, label: age.label } : null,
    country: "Cyprus",
    address: {
      full: company.address_full,
      latin: latinAddress(company.address_full),
      district: company.district_en,
      locality: company.locality,
      postcode: company.postcode,
      is_foreign: company.is_foreign_address,
    },
    officials_role: officialsLabel,
    officials: officials.map((o) => ({ name: o.person_name, position: o.position_en })),
    profile_url: `${BASE_URL}/company/${company.canonical_slug ?? companyCanonicalSlug(company)}`,
    source: "Cyprus Registrar of Companies via Companies House Cyprus",
    disclaimer:
      "Public registry data provided for information purposes only; it does not constitute legal or credit advice.",
  };

  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}
