import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { CompanyListItem } from "@/lib/companies.functions";
import {
  DIRECTORY_MAX_PAGE,
  DIRECTORY_PAGE_SIZE,
  DIRECTORY_SIGNALS,
  getDirectorySignal,
} from "@/lib/directory-signals";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createServerFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, headerKey) => headers.set(headerKey, value));
    }
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
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
 * Counts are read from the pre-aggregated `directory_signal_counts` table:
 * counting 570k+ rows per request blows the Postgres statement timeout.
 */
async function readSignalCounts(supabase: ReturnType<typeof getServerClient>) {
  const { data, error } = await supabase
    .from("directory_signal_counts")
    .select("signal, company_count, refreshed_at");
  if (error) throw error;
  const byStatus = new Map<string, number>();
  let refreshedAt: string | null = null;
  for (const row of data ?? []) {
    byStatus.set(row.signal, Number(row.company_count));
    if (!refreshedAt || (row.refreshed_at && row.refreshed_at > refreshedAt)) {
      refreshedAt = row.refreshed_at;
    }
  }
  return { byStatus, refreshedAt };
}

function countFor(byStatus: Map<string, number>, statuses: string[]): number {
  return statuses.reduce((total, status) => total + (byStatus.get(status) ?? 0), 0);
}

export async function readDirectoryOverview() {
  const supabase = getServerClient();
  const [{ byStatus, refreshedAt }, sanctions] = await Promise.all([
    readSignalCounts(supabase),
    supabase
      .from("sanctions_entries")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("entity_type", "entity"),
  ]);

  return {
    refreshedAt,
    sanctionedEntityCount: sanctions.error ? null : (sanctions.count ?? null),
    signals: DIRECTORY_SIGNALS.map((signal) => ({
      slug: signal.slug,
      title: signal.title,
      summary: signal.summary,
      group: signal.group,
      count: countFor(byStatus, signal.statuses),
    })),
  };
}

export async function readDirectorySignalPage(slugParam: string, pageParam: number) {
  const signal = getDirectorySignal(slugParam);
  if (!signal) throw new Error(`Unknown directory signal: ${slugParam}`);
  const page = Math.min(Math.max(1, Math.floor(pageParam) || 1), DIRECTORY_MAX_PAGE);

  const supabase = getServerClient();
  const [{ byStatus, refreshedAt }, listed] = await Promise.all([
    readSignalCounts(supabase),
    supabase.rpc("companies_by_status_page", {
      p_statuses: signal.statuses,
      p_limit: DIRECTORY_PAGE_SIZE,
      p_offset: (page - 1) * DIRECTORY_PAGE_SIZE,
    } as never),
  ]);

  if (listed.error) throw listed.error;

  return {
    page,
    refreshedAt,
    count: countFor(byStatus, signal.statuses),
    rows: ((listed.data ?? []) as CompanyListItem[]).slice(),
  };
}
