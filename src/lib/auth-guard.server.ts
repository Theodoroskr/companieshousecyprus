import { createClient } from "@supabase/supabase-js";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

export type AuthMode = "signin" | "signup" | "forgot";

function adminClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase service credentials");
  const isNewKey = key.startsWith("sb_secret_") || key.startsWith("sb_publishable_");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewKey && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function readHeader(name: string): string | null {
  try {
    const headers = getRequestHeaders() as unknown as Headers;
    return headers.get(name);
  } catch {
    return null;
  }
}

function referrerHost(): string | null {
  const referer = readHeader("referer");
  if (!referer) return null;
  try {
    return new URL(referer).host || null;
  } catch {
    return null;
  }
}

function clientIp(): string | null {
  return (
    readHeader("cf-connecting-ip") ??
    readHeader("x-real-ip") ??
    (readHeader("x-forwarded-for") ?? "").split(",")[0]?.trim() ??
    null
  );
}

export function captchaConfigured(): boolean {
  return Boolean(process.env["TURNSTILE_SECRET_KEY"]);
}

async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret) return true; // captcha not configured yet — fail open so sign-in keeps working
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  const ip = clientIp();
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

async function logAttempt(mode: AuthMode, outcome: "pass" | "fail" | "missing") {
  try {
    await adminClient()
      .from("auth_traffic_events")
      .insert({
        mode,
        outcome,
        country: readHeader("cf-ipcountry"),
        referrer_host: referrerHost(),
        path: "/auth",
        user_agent: (readHeader("user-agent") ?? "").slice(0, 300) || null,
      });
  } catch {
    // logging must never block authentication
  }
}

/** Verifies the Turnstile token (when configured) and records the attempt for bot analytics. */
export async function verifyAuthAttempt(mode: AuthMode, token: string | null) {
  const configured = captchaConfigured();
  const ok = await verifyTurnstile(token);
  await logAttempt(mode, ok ? "pass" : token ? "fail" : "missing");
  if (!ok) {
    throw new Error(
      configured && !token
        ? "Please complete the human verification check."
        : "Human verification failed. Please try again.",
    );
  }
  return { ok: true as const };
}

export type TrafficRow = { key: string; total: number; passed: number };
export type TrafficBreakdown = {
  total: number;
  passed: number;
  blocked: number;
  by_country: TrafficRow[];
  by_referrer: TrafficRow[];
  by_mode: TrafficRow[];
  by_day: TrafficRow[];
};

export async function readAuthTrafficBreakdown(days: number): Promise<TrafficBreakdown> {
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString();
  const { data, error } = await adminClient().rpc("auth_traffic_breakdown", { p_since: since });
  if (error) throw new Error(error.message);
  return (data ?? {
    total: 0,
    passed: 0,
    blocked: 0,
    by_country: [],
    by_referrer: [],
    by_mode: [],
    by_day: [],
  }) as unknown as TrafficBreakdown;
}
