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
  
  const { data: staleRuns, error: fetchError } = await supabase
    .from("import_runs")
    .select("id")
    .eq("status", "running")
    .lt("updated_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());
  
  if (fetchError) throw fetchError;
  
  for (const run of staleRuns ?? []) {
    const { error } = await supabase
      .from("import_runs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        message: "Import did not finish before client disconnected; partial data preserved.",
      })
      .eq("id", run.id);
    if (error) console.error("failed to update run", run.id, error.message);
    else console.log("marked stale run completed:", run.id);
  }
  
  const { data, error } = await supabase.rpc("refresh_officials_count");
  if (error) throw error;
  console.log("refreshed officials count for companies:", data);
}

main().catch((e) => { console.error(e); process.exit(1); });
