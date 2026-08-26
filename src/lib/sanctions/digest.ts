/**
 * Extraction of source-provided integrity digests from HTTP response headers.
 *
 * Sanctions publishers advertise the SHA-256 of the file in various headers:
 *  - `Digest: sha-256=:base64:` (RFC 3230) / `Repr-Digest` (RFC 9530)
 *  - `x-checksum-sha256` / `x-amz-checksum-sha256` (hex or base64)
 *  - `x-content-sha256` (hex)
 *
 * We normalise everything to lowercase hex so it can be compared with the
 * SHA-256 we compute over the downloaded bytes.
 */

export interface OfficialDigest {
  /** Normalised lowercase hex SHA-256 (64 chars). */
  sha256Hex: string;
  /** Name of the header the digest came from. */
  header: string;
  /** Raw header value, kept for audit history. */
  raw: string;
}

const HEX64 = /^[0-9a-f]{64}$/i;

function base64ToHex(value: string): string | null {
  try {
    // Accept both standard and URL-safe base64, with or without padding.
    const normalised = value.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(normalised), (c) => c.charCodeAt(0));
    if (bytes.byteLength !== 32) return null;
    return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function normaliseDigestValue(value: string): string | null {
  const trimmed = value.trim();
  if (HEX64.test(trimmed)) return trimmed.toLowerCase();
  return base64ToHex(trimmed);
}

/** Parse `sha-256=…` members from a Digest / Repr-Digest field value. */
function parseDigestField(value: string): string | null {
  // Members can be comma-separated; take the first sha-256 one.
  for (const member of value.split(",")) {
    const match = /sha-256\s*=\s*(?::([A-Za-z0-9+/=_-]+):|"?([0-9a-fA-F]{64})"?|"?([A-Za-z0-9+/=_-]+)"?)/i.exec(
      member.trim(),
    );
    if (!match) continue;
    const hex = match[2]?.toLowerCase() ?? (match[1] ? base64ToHex(match[1]) : null) ?? (match[3] ? base64ToHex(match[3]) : null);
    if (hex && HEX64.test(hex)) return hex;
  }
  return null;
}

/**
 * Extract the source-provided SHA-256 digest from response headers.
 * Returns null when the source publishes no usable digest.
 */
export function extractOfficialDigest(headers: Headers): OfficialDigest | null {
  for (const name of ["repr-digest", "digest"]) {
    const raw = headers.get(name);
    if (!raw) continue;
    const hex = parseDigestField(raw);
    if (hex) return { sha256Hex: hex, header: name, raw };
  }
  for (const name of ["x-checksum-sha256", "x-amz-checksum-sha256", "x-content-sha256", "x-sha256"]) {
    const raw = headers.get(name);
    if (!raw) continue;
    const hex = normaliseDigestValue(raw);
    if (hex) return { sha256Hex: hex, header: name, raw };
  }
  return null;
}

/**
 * Compare our computed hash with the official digest.
 * Returns null when they match (or no official digest was provided) and a
 * human-readable mismatch report otherwise.
 */
export function digestMismatchReport(
  computedHex: string,
  official: OfficialDigest | null,
): string | null {
  if (!official) return null;
  if (official.sha256Hex === computedHex.toLowerCase()) return null;
  return (
    `SHA-256 mismatch: source advertised ${official.sha256Hex} (${official.header}: ${official.raw}) ` +
    `but the downloaded bytes hash to ${computedHex.toLowerCase()}. Refusing to publish a possibly corrupt or tampered file.`
  );
}
