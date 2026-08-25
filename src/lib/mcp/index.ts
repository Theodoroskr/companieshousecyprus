import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchCompaniesTool from "./tools/search-companies";
import getCompanyProfileTool from "./tools/get-company-profile";
import listProductsTool from "./tools/list-products";

export default defineMcp({
  name: "companies-house-cyprus",
  title: "Companies House Cyprus",
  version: "0.1.0",
  instructions:
    "Public tools for the Cyprus company registry as published on companieshousecyprus.com. Use `search_companies` to find companies by name or registration number (e.g. \"HE 252407\", \"C 4404\"), `get_company_profile` for a full public profile (status, registration date, company age, address in Greek and Latin script, officials), and `list_products` for the orderable certificates and reports with prices. All data is public registry information; no customer, order, or account data is available.",
  // Cast: defineTool leaves `outputSchema` inferred as undefined, which the
  // readonly AnyToolDefinition[] rejects under exactOptionalPropertyTypes.
  tools: [searchCompaniesTool, getCompanyProfileTool, listProductsTool] as unknown as Parameters<
    typeof defineMcp
  >[0]["tools"],
});
