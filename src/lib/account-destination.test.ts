import { describe, expect, it } from "vitest";

import { accountDestination } from "./account-destination";

describe("account destination", () => {
  it("sends administrators to the admin dashboard", () => {
    expect(accountDestination(["client", "admin"])).toBe("/admin/orders");
  });

  it("sends clients to their orders", () => {
    expect(accountDestination(["client"])).toBe("/account/orders");
  });

  it("defaults authenticated accounts without a role to their orders", () => {
    expect(accountDestination([])).toBe("/account/orders");
  });
});