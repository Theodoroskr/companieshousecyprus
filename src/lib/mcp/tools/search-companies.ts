import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { searchCompanies } from "@/lib/companies.functions";
import { displayOfficialNo } from "@/lib/format";

const BASE_URL = "https://companieshousecyprus.com";

export default defineTool({
  name: "search_companies",
  title: "Search Cyprus companies",
  description:
    "Search the public Cyprus company registry by company name fragment or registration number (e.g. 'HE 252407', 'C 4404'). Returns matching companies with registration number, status, district and a profile URL.",
  inputSchema: {
    query: z.string().describe("Company name fragment or registration number."),
    page: z.number().int().optional().describe("Result page, starting at 1. Defaults to 1."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, page }) => {
    const q = query.trim();
    if (!q) throw new ToolError("query must not be empty");

    let result: Awaited<ReturnType<typeof searchCompanies>>;
    try {
      result = await searchCompanies({ data: { q, page: Math.max(1, page ?? 1) } });
    } catch (error) {
      throw new ToolError(`Registry search failed: ${(error as Error).message}`);
    }

    const rows = result.rows.slice(0, 25).map((row) => ({
      name: row.name,
      registration_number: displayOfficialNo(row),
      status: row.status_en,
      status_group: row.status_group,
      district: row.district_en,
      locality: row.locality,
      profile_url: `${BASE_URL}/company/${row.slug}`,
      slug: row.slug,
    }));

    const payload = { total_matches: result.count, returned: rows.length, results: rows };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
