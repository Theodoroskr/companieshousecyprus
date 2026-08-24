/**
 * Revolut Merchant API (server only).
 * Docs: https://developer.revolut.com/docs/merchant/merchant-api
 */

const API_VERSION = "2024-09-01";

function baseUrl() {
  const env = (process.env["REVOLUT_ENV"] ?? "").toLowerCase();
  return env === "sandbox"
    ? "https://sandbox-merchant.revolut.com/api"
    : "https://merchant.revolut.com/api";
}

function secretKey() {
  const key = process.env["REVOLUT_SECRET_KEY"];
  if (!key) throw new Error("REVOLUT_SECRET_KEY is not configured");
  return key;
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Revolut-Api-Version": API_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Revolut ${response.status}: ${text.slice(0, 400)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export type RevolutOrder = {
  id: string;
  state: string;
  amount: number;
  currency: string;
  checkout_url?: string;
  merchant_order_data?: { reference?: string };
};

export async function createRevolutOrder(params: {
  amountCents: number;
  reference: string;
  description: string;
  email: string;
  fullName: string;
  redirectUrl: string;
}): Promise<RevolutOrder> {
  return call<RevolutOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amountCents,
      currency: "EUR",
      description: params.description.slice(0, 200),
      capture_mode: "automatic",
      merchant_order_data: { reference: params.reference },
      redirect_url: params.redirectUrl,
      customer: { email: params.email, full_name: params.fullName },
    }),
  });
}

export async function retrieveRevolutOrder(id: string): Promise<RevolutOrder> {
  return call<RevolutOrder>(`/orders/${encodeURIComponent(id)}`);
}

/** Verify a Revolut webhook signature (v1 = HMAC-SHA256 of "v1.{timestamp}.{body}"). */
export async function verifyWebhookSignature(params: {
  body: string;
  signatureHeader: string | null;
  timestampHeader: string | null;
}): Promise<boolean> {
  const secret = process.env["REVOLUT_WEBHOOK_SECRET"];
  if (!secret) return false;
  const { signatureHeader, timestampHeader, body } = params;
  if (!signatureHeader || !timestampHeader) return false;

  // Reject replays older than 5 minutes.
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`v1.${timestampHeader}.${body}`));
  const expected = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");

  // The header may carry several comma-separated signatures.
  return signatureHeader
    .split(",")
    .map((part) => part.trim().replace(/^v1=/, ""))
    .some((candidate) => timingSafeEqual(candidate, expected));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
