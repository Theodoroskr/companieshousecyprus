import { describe, expect, it } from "vitest";
import { resolveDistrict } from "./districts";

describe("resolveDistrict", () => {
  it("serves the canonical lowercase district slug", () => {
    expect(resolveDistrict("nicosia")).toEqual({ kind: "ok", district: { slug: "nicosia", name: "Nicosia" } });
  });

  it("redirects capitalised slugs to the lowercase page", () => {
    expect(resolveDistrict("Limassol")).toEqual({ kind: "redirect", slug: "limassol" });
  });

  it("redirects Greek spellings to the English district page", () => {
    expect(resolveDistrict("lefkosia")).toEqual({ kind: "redirect", slug: "nicosia" });
    expect(resolveDistrict("lemesos")).toEqual({ kind: "redirect", slug: "limassol" });
    expect(resolveDistrict("pafos")).toEqual({ kind: "redirect", slug: "paphos" });
  });

  it("treats anything else as unknown so it returns 404, not an empty page", () => {
    expect(resolveDistrict("atlantis")).toEqual({ kind: "unknown" });
    expect(resolveDistrict("%E0%A4%A")).toEqual({ kind: "unknown" });
  });
});
