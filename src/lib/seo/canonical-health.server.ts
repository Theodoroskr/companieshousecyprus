import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { chunkIndexForRank } from "@/lib/seo/canonical-health";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createServerFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isNewSupabaseApiKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function client() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: createServerFetch(key) },
  });
}

export type Sampled = { slug: string; canonicalSlug: string; sample: string };

/**
 * Build a representative sample of company slugs:
 *  - `recent`: newest registry changes (most likely to be missing from a stale sitemap)
 *  - `boundary`: first and last slug of every sitemap chunk (catches paging drift)
 *  - `random`: uniformly spread offsets across slug order
 *  - `explicit`: caller-provided slugs
 */
export async function sampleCompanySlugs(opts: {
  recent: number;
  random: number;
  boundaries: boolean;
  explicit: string[];
}): Promise<{ samples: Sampled[]; total: number }> {
  const supabase = client();
  const seen = new Map<string, { canonicalSlug: string; sample: string }>();
  const add = (slug: string, canonicalSlug: string | null, sample: string) => {
    if (slug && !seen.has(slug)) seen.set(slug, { canonicalSlug: canonicalSlug || slug, sample });
  };

  if (opts.explicit.length > 0) {
    const { data, error } = await supabase
      .from("companies")
      .select("slug, canonical_slug")
      .in("slug", opts.explicit);
    if (error) throw error;
    const canonicalBySlug = new Map((data ?? []).map((r) => [r.slug, r.canonical_slug]));
    for (const slug of opts.explicit) add(slug, canonicalBySlug.get(slug) ?? null, "explicit");
  }

  const { count, error: countError } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });
  if (countError) throw countError;
  const total = count ?? 0;

  if (opts.recent > 0) {
    const { data, error } = await supabase
      .from("companies")
      .select("slug, canonical_slug")
      .order("updated_at", { ascending: false })
      .limit(opts.recent);
    if (error) throw error;
    for (const row of data ?? []) add(row.slug, row.canonical_slug, "recent");
  }

  if (opts.boundaries && total > 0) {
    const chunks = chunkIndexForRank(total - 1) + 1;
    for (let c = 0; c < chunks; c++) {
      const first = c * 50_000;
      const last = Math.min(total - 1, first + 50_000 - 1);
      for (const [offset, kind] of [[first, "boundary-first"], [last, "boundary-last"]] as const) {
        const { data, error } = await supabase
          .from("companies")
          .select("slug, canonical_slug")
          .order("slug", { ascending: true })
          .range(offset, offset);
        if (error) throw error;
        const row = data?.[0];
        if (row?.slug) add(row.slug, row.canonical_slug, kind);
      }
    }
  }

  if (opts.random > 0 && total > 0) {
    for (let i = 0; i < opts.random; i++) {
      const offset = Math.floor(Math.random() * total);
      const { data, error } = await supabase
        .from("companies")
        .select("slug, canonical_slug")
        .order("slug", { ascending: true })
        .range(offset, offset);
      if (error) throw error;
      const row = data?.[0];
      if (row?.slug) add(row.slug, row.canonical_slug, "random");
    }
  }

  return {
    samples: Array.from(seen, ([slug, v]) => ({ slug, canonicalSlug: v.canonicalSlug, sample: v.sample })),
    total,
  };
}

/** 0-based rank of a slug in ascending slug order (used to derive its sitemap chunk). */
export async function slugRank(slug: string): Promise<number> {
  const supabase = client();
  const { count, error } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .lt("slug", slug);
  if (error) throw error;
  return count ?? 0;
}
