/**
 * API4ALL v3 client (server-only).
 * Docs: https://api4all.readme.io/v3.0/reference/introduction
 *
 * Credentials come from project secrets:
 *   API4ALL_USERNAME, API4ALL_PASSWORD, API4ALL_API_KEY
 */

import { REPORT_PRODUCTS, type A4AReportKind } from "@/lib/api4all-codes";

const BASE = "https://v3.api4all.io/a4a/3.0/api";

type TokenCache = { token: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

function credentials() {
  const username = process.env["API4ALL_USERNAME"];
  const password = process.env["API4ALL_PASSWORD"];
  const apiKey = process.env["API4ALL_API_KEY"];
  if (!username || !password || !apiKey) {
    throw new Error("API4ALL credentials are not configured");
  }
  return { username, password, apiKey };
}

function pickToken(payload: unknown): { token: string; expiresIn: number } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const nested = (record["data"] ?? record["result"] ?? record) as Record<string, unknown>;
  const raw =
    nested["access_token"] ?? nested["token"] ?? record["access_token"] ?? record["token"];
  if (typeof raw !== "string" || !raw) return null;
  const expiresRaw = nested["expires_in"] ?? record["expires_in"];
  const expiresIn = typeof expiresRaw === "number" ? expiresRaw : Number(expiresRaw) || 3300;
  return { token: raw, expiresIn };
}

export async function getAccessToken(force = false): Promise<string> {
  if (!force && cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const { username, password, apiKey } = credentials();
  const basic = btoa(`${username}:${password}`);
  const response = await fetch(`${BASE}/token/${encodeURIComponent(apiKey)}`, {
    method: "GET",
    headers: { Authorization: `Basic ${basic}`, Accept: "application/json" },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API4ALL token request failed (${response.status}): ${text.slice(0, 300)}`);
  }
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text.trim();
  }
  const parsed =
    typeof payload === "string" && payload
      ? { token: payload, expiresIn: 3300 }
      : pickToken(payload);
  if (!parsed) throw new Error("API4ALL token response did not contain a token");
  cachedToken = { token: parsed.token, expiresAt: Date.now() + parsed.expiresIn * 1000 };
  return parsed.token;
}

async function apiGet<T>(path: string): Promise<T> {
  const request = async (token: string) =>
    fetch(`${BASE}${path}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        Expires: "0",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });

  let response = await request(await getAccessToken());
  if (response.status === 401 || response.status === 403) {
    response = await request(await getAccessToken(true));
  }
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API4ALL request failed (${response.status}): ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("API4ALL returned a non-JSON response");
  }
}

export type A4ASearchHit = {
  code: string | null;
  name: string | null;
  regNo: string | null;
  vatNo: string | null;
  status: string | null;
  address: string | null;
  rawJson: string;
};

function str(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function collectRows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["data", "results", "result", "items", "records", "companies"]) {
      const value = record[key];
      if (Array.isArray(value)) return collectRows(value);
      if (value && typeof value === "object") return collectRows(value);
    }
    if (Object.keys(record).length) return [record];
  }
  return [];
}

function normaliseHit(row: Record<string, unknown>): A4ASearchHit {
  return {
    code: str(row["code"] ?? row["a4a_code"] ?? row["company_code"]),
    name: str(row["name"] ?? row["company_name"] ?? row["legal_name"]),
    regNo: str(row["reg_no"] ?? row["registration_number"] ?? row["regNo"]),
    vatNo: str(row["vat_no"] ?? row["vatNo"] ?? row["vat"]),
    status: str(row["status"] ?? row["company_status"]),
    address: str(row["address"] ?? row["full_address"] ?? row["registered_address"]),
    rawJson: JSON.stringify(row),
  };
}

export async function searchByRegistration(regNo: string): Promise<A4ASearchHit[]> {
  const payload = await apiGet<unknown>(`/search/cy/reg_no/${encodeURIComponent(regNo)}`);
  return collectRows(payload).map(normaliseHit);
}

export async function searchByName(name: string): Promise<A4ASearchHit[]> {
  const payload = await apiGet<unknown>(`/search/cy/name/${encodeURIComponent(name)}`);
  return collectRows(payload).map(normaliseHit);
}

export type { A4AReportKind } from "@/lib/api4all-codes";

export async function fetchReport(kind: A4AReportKind, code: string): Promise<unknown> {
  return apiGet<unknown>(`/report/${kind}/code/${encodeURIComponent(code)}`);
}

export { REPORT_PRODUCTS } from "@/lib/api4all-codes";

export async function createOrder(input: {
  kind: A4AReportKind;
  code: string;
  reference: string;
  language?: string;
  speed?: string;
}): Promise<unknown> {
  const token = await getAccessToken();
  const body = {
    reference: input.reference,
    items: [
      {
        code: input.code,
        reference: input.reference,
        language: input.language ?? "EN",
        product: REPORT_PRODUCTS[input.kind],
        format: "JSON",
        speed: input.speed ?? "Normal",
        // Always request a fresh investigation so reports are re-verified at source.
        freshinvestigation: 1,
        comments: "",
      },
    ],
  };
  const response = await fetch(`${BASE}/orders/create/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      Expires: "0",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API4ALL order failed (${response.status}): ${text.slice(0, 400)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
