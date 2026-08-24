import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCompanyBySlug } from "@/lib/companies.functions";
import { searchCompanies } from "@/lib/companies.functions";
import { displayOfficialNo, formatDate, companyAge, latinAddress, isBusinessName } from "@/lib/format";

const LookupInput = z.object({
  q: z.string().min(1).max(200),
});

/**
 * Public JSON lookup endpoint for AI agents and external integrations.
 *
 * Accepts a registration number (e.g. "HE 252407", "C 4404") or a company
 * name/slug fragment and returns a structured company profile with a canonical
 * profile URL. No authentication required; rate-limited by the hosting edge.
 */
export const Route = createFileRoute("/api/public/company-lookup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const parsed = LookupInput.safeParse(raw);
        if (!parsed.success) {
          return new Response(JSON.stringify({ error: "Missing or invalid 'q' parameter" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        const q = parsed.data.q.trim();
        const baseUrl = "https://companieshousecyprus.com";

        // If the query looks like a registration number, try an exact-ish lookup first.
        const regLike = q.toUpperCase().replace(/\s+/g, " ");
        const isRegNumber = /^(HE|C|P|S|BN)?\s?\d{1,6}$/i.test(regLike) || /^\d{1,6}$/.test(regLike);

        if (isRegNumber) {
          const digits = regLike.replace(/\D/g, "");
          const prefix = regLike.replace(/\d/g, "").trim() || undefined;
          const candidates: string[] = [];
          if (prefix) {
            candidates.push(`${prefix.toLowerCase()}${digits}`);
            candidates.push(`${prefix.toLowerCase()}-${digits}`);
          }
          candidates.push(digits);
          candidates.push(`he${digits}`);
          candidates.push(`c${digits}`);
          candidates.push(`p${digits}`);

          for (const slugGuess of candidates) {
            try {
              const result = await getCompanyBySlug({ data: { slug: slugGuess } });
              if (result.company) {
                return Response.json(buildResponse(result, baseUrl));
              }
            } catch {
              // continue to next candidate
            }
          }
        }

        // Fall back to name search.
        const search = await searchCompanies({ data: { q, page: 1 } });
        const first = search.rows[0];
        if (!first) {
          return new Response(JSON.stringify({ error: "No company found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }

        try {
          const result = await getCompanyBySlug({ data: { slug: first.slug } });
          return Response.json(buildResponse(result, baseUrl));
        } catch {
          return Response.json({
            name: first.name,
            registration_number: displayOfficialNo(first),
            status: first.status_en,
            type: first.type_code,
            profile_url: `${baseUrl}/company/${first.slug}`,
          });
        }
      },
    },
  },
});

function buildResponse(
  result: Awaited<ReturnType<typeof getCompanyBySlug>>,
  baseUrl: string,
) {
  const { company, officials } = result;
  const age = companyAge(company.registration_date);
  const ownerLabel = isBusinessName(company) ? "Owner" : undefined;

  return {
    name: company.name,
    registration_number: displayOfficialNo(company),
    type: company.type_en,
    subtype: company.subtype_en,
    status: company.status_en,
    status_group: company.status_group,
    status_date: formatDate(company.status_date),
    registration_date: formatDate(company.registration_date),
    company_age: age ? { years: age.years, months: age.months, label: age.label } : null,
    address: {
      full: company.address_full,
      latin: latinAddress(company.address_full),
      building: company.building,
      street: company.street,
      locality: company.locality,
      district: company.district_en,
      district_el: company.district_el,
      postcode: company.postcode,
      is_foreign: company.is_foreign_address,
    },
    officials: officials.map((o) => ({
      name: o.person_name,
      position: o.position_en,
      position_el: o.position_el,
      is_owner: ownerLabel ? o.position_en?.includes(ownerLabel) : false,
    })),
    profile_url: `${baseUrl}/company/${company.slug}`,
    source: "Cyprus Registrar of Companies via Companies House Cyprus",
    disclaimer:
      "This profile is derived from public registry data for information purposes only and does not constitute legal advice.",
  };
}
