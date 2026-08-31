import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTH_GUARD_COOKIE,
  COOKIELESS_THRESHOLD,
  decideAuthGuard,
  guardToken,
  resetAuthGuardState,
} from "@/lib/auth-edge-guard";

const now = new Date("2026-08-30T12:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);

function req(headers: Record<string, string>, path = "/auth", method = "GET") {
  return new Request(`https://companieshousecyprus.com${path}`, {
    method,
    headers: { "cf-connecting-ip": "203.0.113.9", ...headers },
  });
}

describe("auth edge guard", () => {
  beforeEach(() => resetAuthGuardState());

  it("hard-blocks every CN request to /auth, cookies or not", () => {
    const cookie = `${AUTH_GUARD_COOKIE}=${guardToken(now)}`;
    for (let i = 0; i < 10; i++) {
      expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }), later(i))).toBe("block");
      expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html", cookie }), later(i))).toBe("block");
      expect(
        decideAuthGuard(
          req({ "cf-ipcountry": "CN", accept: "text/html", referer: "https://companieshousecyprus.com/" }),
          later(i),
        ),
      ).toBe("block");
    }
  });

  it("hard-blocks CN on /login as well, including non-GET requests", () => {
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }, "/login"))).toBe("block");
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }, "/login/"))).toBe("block");
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", "sec-fetch-dest": "script" }, "/login"))).toBe("block");
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }, "/login", "POST"))).toBe("block");
  });

  it("does not block CN on other paths", () => {
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }, "/"))).toBe("allow");
    expect(decideAuthGuard(req({ "cf-ipcountry": "CN", accept: "text/html" }, "/reset-password"))).toBe("allow");
  });

  it("lets the first cookieless direct HK hits through", () => {
    for (let i = 0; i < COOKIELESS_THRESHOLD; i++) {
      expect(decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }), later(i))).toBe("allow");
    }
  });

  it("challenges only once repeat cookieless hits exceed the threshold", () => {
    for (let i = 0; i < COOKIELESS_THRESHOLD; i++) {
      decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }), later(i));
    }
    expect(decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }), later(100))).toBe("challenge");
  });

  it("scores each client separately", () => {
    for (let i = 0; i <= COOKIELESS_THRESHOLD; i++) {
      decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }), later(i));
    }
    expect(
      decideAuthGuard(
        req({ "cf-ipcountry": "HK", accept: "text/html", "cf-connecting-ip": "198.51.100.7" }),
        later(200),
      ),
    ).toBe("allow");
  });

  it("forgets a client after the window passes", () => {
    for (let i = 0; i <= COOKIELESS_THRESHOLD; i++) {
      decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }), later(i));
    }
    expect(decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }), later(700_000))).toBe("allow");
  });

  it("never challenges a client that has proven JS, even under the threshold", () => {
    const cookie = `${AUTH_GUARD_COOKIE}=${guardToken(now)}`;
    for (let i = 0; i < 50; i++) {
      expect(decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html", cookie }), later(i))).toBe("allow");
    }
  });

  it("accepts yesterday's token so the cookie survives midnight", () => {
    const cookie = `${AUTH_GUARD_COOKIE}=${guardToken(new Date(now.getTime() - 86_400_000))}`;
    for (let i = 0; i < 10; i++) {
      expect(decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html", cookie }), later(i))).toBe("allow");
    }
  });

  it("never challenges internal navigation from our own pages", () => {
    for (let i = 0; i < 10; i++) {
      expect(
        decideAuthGuard(
          req({ "cf-ipcountry": "HK", accept: "text/html", referer: "https://companieshousecyprus.com/" }),
          later(i),
        ),
      ).toBe("allow");
    }
  });

  it("never challenges other countries, non-documents or other paths", () => {
    for (let i = 0; i < 10; i++) {
      expect(decideAuthGuard(req({ "cf-ipcountry": "CY", accept: "text/html" }), later(i))).toBe("allow");
      expect(decideAuthGuard(req({ accept: "text/html" }), later(i))).toBe("allow");
      expect(decideAuthGuard(req({ "cf-ipcountry": "HK", "sec-fetch-dest": "script" }), later(i))).toBe("allow");
      expect(decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }, "/"), later(i))).toBe("allow");
      expect(decideAuthGuard(req({ "cf-ipcountry": "HK", accept: "text/html" }, "/auth", "POST"), later(i))).toBe(
        "allow",
      );
    }
  });
});
