import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCompanySlug } from "@/lib/slug";
import { normaliseCompanyKey } from "@/lib/registrar-mapping";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function client() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
        if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

/** Resolve a legacy registry token to a live company slug, if one exists. */
export async function resolveLegacyCompanySlug(token: string | null): Promise<string | null> {
  if (!token) return null;
  const direct = normalizeCompanySlug(token);
  // Legacy URLs carry public prefixes (HE/EE/AE/BN); stored keys use the
  // internal type codes (C/B/O/N), so try the mapped key as well.
  const mapped = normaliseCompanyKey("", direct)?.slug ?? null;
  const candidates = Array.from(new Set([direct, mapped].filter((v): v is string => Boolean(v))));
  if (candidates.length === 0) return null;
  try {
    const supabase = client();
    const { data } = await supabase
      .from("companies")
      .select("slug")
      .in("slug", candidates)
      .limit(1);
    return data?.[0]?.slug ?? null;
  } catch (error) {
    console.error("legacy slug resolution failed", error);
    return null;
  }
}
