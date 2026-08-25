import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCompanySlug } from "@/lib/slug";

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
  const slug = normalizeCompanySlug(token);
  if (!slug) return null;
  try {
    const supabase = client();
    const { data } = await supabase
      .from("companies")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();
    return data?.slug ?? null;
  } catch (error) {
    console.error("legacy slug resolution failed", error);
    return null;
  }
}
