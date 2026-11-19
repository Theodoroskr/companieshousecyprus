import { describe, expect, it } from "vitest";
import { pickLatestFileUrls } from "@/lib/registry-sync.server";

describe("pickLatestFileUrls", () => {
  it("picks the highest-numbered export for each file", () => {
    const html = `
      <a href="/sites/default/files/organisations_97.csv">old</a>
      <a href="/sites/default/files/organisations_103.csv">new</a>
      <a href="/sites/default/files/organisation_officials_89.csv">o</a>
      <a href="/sites/default/files/registered_office_102.csv">a</a>`;
    expect(pickLatestFileUrls(html)).toEqual({
      organisations: "https://data.gov.cy/sites/default/files/organisations_103.csv",
      officials: "https://data.gov.cy/sites/default/files/organisation_officials_89.csv",
      addresses: "https://data.gov.cy/sites/default/files/registered_office_102.csv",
    });
  });
});
