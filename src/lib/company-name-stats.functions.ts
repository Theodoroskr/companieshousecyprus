import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { cached } from "@/lib/server-cache";
import type { CompanyNameStats } from "@/lib/company-name-stats";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createServerFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
      headers.set("apikey", key);
    }
    return fetch(input, { ...init, headers });
  };
}

function getServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: createServerFetch(key) },
  });
}

/**
 * Aggregate statistics over the names of every registered Cyprus entity.
 * The aggregation itself lives in `public.company_name_stats()` (a single
 * sequential scan); the result is a few KB of JSON, cached per worker for
 * 24h so the expensive scan runs at most once a day per isolate.
 *
 * Never throws: returns null on failure so the page can show a friendly
 * "temporarily unavailable" notice instead of a 500.
 */
export const getCompanyNameStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<CompanyNameStats | null> =>
    cached("stats:company-names", 24 * 60 * 60_000, async () => {
      try {
        const supabase = getServerClient();
        const { data, error } = await supabase.rpc("company_name_stats" as never);
        if (error || !data) return null;
        return data as unknown as CompanyNameStats;
      } catch {
        return null;
      }
    }),
);
