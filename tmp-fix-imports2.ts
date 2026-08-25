import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function adminClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server env vars");
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

async function main() {
  const supabase = adminClient();
  const { data, error } = await supabase.rpc("refresh_officials_count_fast");
  if (error) {
    console.error("fast refresh failed:", error.message);
    // fallback: run targeted update via SQL
    const { error: sqlError } = await supabase.rpc("run_sql", {
      sql: `
        WITH counts AS (
          SELECT slug, count(*)::int AS n FROM public.officials GROUP BY slug
        )
        UPDATE public.companies c
        SET officials_count = counts.n
        FROM counts
        WHERE c.slug = counts.slug AND c.officials_count IS DISTINCT FROM counts.n;
      `
    });
    if (sqlError) throw sqlError;
    console.log("targeted refresh done via run_sql");
  } else {
    console.log("fast refresh affected:", data);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
