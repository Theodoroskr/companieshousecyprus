import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { OFFICIALS_ON_RECORD_LABEL } from "./labels";

describe("Officials & owners on record label", () => {
  it("keeps the agreed wording", () => {
    expect(OFFICIALS_ON_RECORD_LABEL).toBe("Officials & owners on record");
  });

  it("is rendered on the company profile page", () => {
    const source = readFileSync("src/routes/company.$slug.tsx", "utf8");
    expect(source).toContain("OFFICIALS_ON_RECORD_LABEL");
  });

  it("never reverts to the old wording anywhere in src", () => {
    const files = import.meta.glob("/src/**/*.{ts,tsx}", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;

    const offenders = Object.entries(files)
      .filter(([path]) => !path.endsWith("labels.test.ts"))
      .filter(([, content]) => /Officials on record/i.test(content))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });
});
