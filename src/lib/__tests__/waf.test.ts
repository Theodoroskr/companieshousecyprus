import { beforeEach, describe, expect, it } from "vitest";
import { AUTH_MAX_HITS, inspectRequest, resetWafState } from "@/lib/waf";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128 Safari/537.36";

function req(path: string, headers: Record<string, string> = {}) {
  return new Request(`https://companieshousecyprus.com${path}`, {
    headers: { "user-agent": UA, "cf-connecting-ip": "203.0.113.9", ...headers },
  });
}

describe("waf", () => {
  beforeEach(() => resetWafState());

  it("denies WordPress-style probe paths", () => {
    for (const path of ["/wp-admin/", "/wp-login.php", "/administrator", "/.env", "/xmlrpc.php", "/adminer.php"]) {
      expect(inspectRequest(req(path)), path).toEqual({ action: "deny", reason: "probe-path" });
    }
  });

  it("allows normal pages and real auth visits", () => {
    expect(inspectRequest(req("/"))).toEqual({ action: "allow" });
    expect(inspectRequest(req("/company/acme-ltd-c1234"))).toEqual({ action: "allow" });
    expect(inspectRequest(req("/auth"))).toEqual({ action: "allow" });
  });

  it("denies scanner and empty user agents on auth paths", () => {
    expect(inspectRequest(req("/auth", { "user-agent": "sqlmap/1.7" }))).toEqual({
      action: "deny",
      reason: "bad-agent",
    });
    expect(inspectRequest(req("/login", { "user-agent": "" }))).toEqual({ action: "deny", reason: "bad-agent" });
  });

  it("rate-limits bursts on auth paths per IP", () => {
    const now = Date.now();
    for (let i = 0; i < AUTH_MAX_HITS; i++) {
      expect(inspectRequest(req("/auth"), now + i)).toEqual({ action: "allow" });
    }
    expect(inspectRequest(req("/auth"), now + AUTH_MAX_HITS)).toEqual({ action: "deny", reason: "rate-limit" });
    // a different IP is unaffected
    expect(inspectRequest(req("/auth", { "cf-connecting-ip": "198.51.100.4" }), now)).toEqual({ action: "allow" });
  });

  it("lets the window slide so honest retries recover", () => {
    const now = Date.now();
    for (let i = 0; i <= AUTH_MAX_HITS; i++) inspectRequest(req("/auth"), now + i);
    expect(inspectRequest(req("/auth"), now + 61_000)).toEqual({ action: "allow" });
  });

  it("blocks auth access for clients that keep probing dead paths", () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) inspectRequest(req("/wp-login.php"), now + i);
    expect(inspectRequest(req("/auth"), now + 10)).toEqual({ action: "deny", reason: "rate-limit" });
  });
});
