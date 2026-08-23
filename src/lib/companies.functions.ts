import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const PAGE_SIZE = 50;
const SITEMAP_CHUNK_SIZE = 50_000;

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
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function getServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: createServerFetch(key) },
  });
}

export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Official = Database["public"]["Tables"]["officials"]["Row"];

export const getCompanyBySlug = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: company, error } = await supabase
      .from("companies")
      .select(
        "slug, name, official_no, reg_number, registration_date, status_en, status_group, status_date, type_en, subtype_en, address_full, building, street, locality, district_en, postcode, is_foreign_address, report_years, officials_count, updated_at",
      )
      .eq("slug", data.slug)
      .single();
    if (error || !company) {
      throw new Error(`Company not found: ${data.slug}`);
    }
    const { data: officials } = await supabase
      .from("officials")
      .select("name, role, appointment_date, cessation_date")
      .eq("company_slug", data.slug)
      .order("role", { ascending: true });
    return { company, officials: officials ?? [] };
  });

export const searchCompanies = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string; page: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const q = data.q.trim().slice(0, 100);
    const page = Math.max(1, data.page);
    if (!q) {
      const { data: rows, error } = await supabase
        .from("companies")
        .select("slug, name, official_no, status_en, status_group, district_en, locality, total_count:companies.count", { count: "exact" })
        .order("name", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: rows ?? [], count: rows?.[0]?.total_count ?? 0 };
    }
    const { data: rows, error } = await supabase
      .from("companies")
      .select("slug, name, official_no, status_en, status_group, district_en, locality, total_count:companies.count")
      .or(`name.ilike.%${q}%,official_no.ilike.%${q}%`)
      .order("name", { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) throw error;
    return { rows: rows ?? [], count: rows?.[0]?.total_count ?? 0 };
  });

export const listCompaniesByLetter = createServerFn({ method: "GET" })
  .inputValidator((data: { letter: string; page: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const letter = data.letter.toUpperCase().replace(/[^A-Z]/g, "");
    if (!letter) throw new Error("Invalid letter");
    const page = Math.max(1, data.page);
    const { data: rows, error } = await supabase
      .from("companies")
      .select("slug, name, official_no, status_en, status_group, district_en, locality, total_count:companies.count")
      .ilike("name", `${letter}%`)
      .order("name", { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) throw error;
    return { rows: rows ?? [], count: rows?.[0]?.total_count ?? 0 };
  });

export const listCompaniesByDistrict = createServerFn({ method: "GET" })
  .inputValidator((data: { district: string; page: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const district = data.district.trim();
    if (!district) throw new Error("Invalid district");
    const page = Math.max(1, data.page);
    const { data: rows, error } = await supabase
      .from("companies")
      .select("slug, name, official_no, status_en, status_group, district_en, locality, total_count:companies.count")
      .eq("district_en", district)
      .order("name", { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) throw error;
    return { rows: rows ?? [], count: rows?.[0]?.total_count ?? 0 };
  });

export const getDistricts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const { data: rows, error } = await supabase
    .from("companies")
    .select("district_en, count:companies.count")
    .not("district_en", "is", null)
    .order("district_en", { ascending: true });
  if (error) throw error;
  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    if (!r.district_en) continue;
    map.set(r.district_en, (map.get(r.district_en) ?? 0) + (r.count ?? 1));
  }
  return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name));
});

export const getCompanyCount = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const { count, error } = await supabase.from("companies").select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
});

export const getSitemapChunk = createServerFn({ method: "GET" })
  .inputValidator((data: { n: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const n = Math.max(0, data.n);
    const { data: rows, error } = await supabase
      .from("companies")
      .select("slug, updated_at")
      .order("slug", { ascending: true })
      .range(n * SITEMAP_CHUNK_SIZE, (n + 1) * SITEMAP_CHUNK_SIZE - 1);
    if (error) throw error;
    return {
      n,
      rows: (rows ?? []).map((r) => ({ slug: r.slug, updated_at: r.updated_at })),
      hasMore: (rows ?? []).length === SITEMAP_CHUNK_SIZE,
    };
  });
