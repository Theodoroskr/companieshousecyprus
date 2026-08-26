import { describe, expect, it } from "vitest";
import { digestMismatchReport, extractOfficialDigest } from "@/lib/sanctions/digest";

const HEX = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const B64 = "ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0="; // base64 of the same digest

function headers(entries: Record<string, string>): Headers {
  return new Headers(entries);
}

describe("extractOfficialDigest", () => {
  it("parses RFC 9530 Repr-Digest with base64 value", () => {
    const d = extractOfficialDigest(headers({ "repr-digest": `sha-256=:${B64}:` }));
    expect(d).toEqual({ sha256Hex: HEX, header: "repr-digest", raw: `sha-256=:${B64}:` });
  });

  it("parses legacy Digest header and skips non-sha-256 members", () => {
    const d = extractOfficialDigest(headers({ digest: `md5=aaaa, sha-256=:${B64}:` }));
    expect(d?.sha256Hex).toBe(HEX);
    expect(d?.header).toBe("digest");
  });

  it("parses hex Digest value with quotes", () => {
    const d = extractOfficialDigest(headers({ digest: `sha-256="${HEX.toUpperCase()}"` }));
    expect(d?.sha256Hex).toBe(HEX);
  });

  it("parses AWS-style x-checksum-sha256 (base64)", () => {
    const d = extractOfficialDigest(headers({ "x-checksum-sha256": B64 }));
    expect(d?.sha256Hex).toBe(HEX);
  });

  it("parses x-content-sha256 hex", () => {
    const d = extractOfficialDigest(headers({ "x-content-sha256": HEX.toUpperCase() }));
    expect(d?.sha256Hex).toBe(HEX);
  });

  it("prefers Repr-Digest over fallback headers", () => {
    const d = extractOfficialDigest(headers({ "repr-digest": `sha-256=:${B64}:`, "x-content-sha256": "0".repeat(64) }));
    expect(d?.header).toBe("repr-digest");
  });

  it("returns null when no digest header is present", () => {
    expect(extractOfficialDigest(headers({ etag: '"abc"', "content-md5": "xxxx" }))).toBeNull();
  });

  it("ignores malformed digests", () => {
    expect(extractOfficialDigest(headers({ digest: "sha-256=:not-base64-32-bytes!!!:" }))).toBeNull();
  });
});

describe("digestMismatchReport", () => {
  it("returns null when no official digest exists", () => {
    expect(digestMismatchReport(HEX, null)).toBeNull();
  });

  it("returns null when hashes match (case-insensitive)", () => {
    const official = { sha256Hex: HEX, header: "digest", raw: `sha-256=${HEX}` };
    expect(digestMismatchReport(HEX.toUpperCase(), official)).toBeNull();
  });

  it("reports a mismatch with both hashes", () => {
    const official = { sha256Hex: HEX, header: "digest", raw: `sha-256=${HEX}` };
    const report = digestMismatchReport("f".repeat(64), official);
    expect(report).toContain("SHA-256 mismatch");
    expect(report).toContain(HEX);
    expect(report).toContain("f".repeat(64));
  });
});
