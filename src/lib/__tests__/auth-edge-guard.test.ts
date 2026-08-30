import { describe, expect, it } from "vitest";
import { AUTH_GUARD_COOKIE, decideAuthGuard, guardToken } from "@/lib/auth-edge-guard";

const now = new Date("2026-08-30T12:00:00Z");

function req(headers: Record<string, string>, path = "/auth", method = "GET") {
  return new Request(`https://companieshousecyprus.com${path}`, { method, headers });
}

describe("auth edge guard", () => {
  it("challenges cookieless direct CN hits on /auth", () => {
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }), now)).toBe("challenge");
  });

  it("allows the same client once it has proven JS", () => {
    const cookie = `${AUTH_GUARD_COOKIE}=${guardToken(now)}`;
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html", cookie }), now)).toBe("allow");
  });

  it("allows yesterday's token so the cookie survives midnight", () => {
    const cookie = `${AUTH_GUARD_COOKIE}=${guardToken(new Date(now.getTime() - 86_400_000))}`;
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html", cookie }), now)).toBe("allow");
  });

  it("allows internal navigation from our own pages", () => {
    expect(
      decideAuthGuard(
        req({ "cf-ipcountry": "CN", accept: "text/html", referer: "https://companieshousecyprus.com/" }),
        now,
      ),
    ).toBe("allow");
  });

  it("never challenges other countries", () => {
    expect(decideAuthGuard(req({ "cf-ipcountry": "CY", accept: "text/html" }), now)).toBe("allow");
    expect(decideAuthGuard(req({ accept: "text/html" }), now)).toBe("allow");
  });

  it("ignores non-document requests and other paths", () => {
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", "sec-fetch-dest": "script" }), now)).toBe("allow");
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }, "/"), now)).toBe("allow");
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }, "/auth", "POST"), now)).toBe("allow");
  });
});
