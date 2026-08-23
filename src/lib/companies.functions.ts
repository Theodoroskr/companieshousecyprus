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

export type CompanyListItem = Pick<
  Company,
  "slug" | "type_code" | "name" | "official_no" | "reg_number" | "status_en" | "status_group" | "district_en" | "locality"
>;

export const getCompanyBySlug = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: company, error } = await supabase
      .from("companies")
      .select(
        "slug, type_code, name, official_no, reg_number, registration_date, status_en, status_group, status_date, type_en, subtype_en, address_full, building, street, locality, district_el, district_en, postcode, is_foreign_address, report_years, officials_count, updated_at",
      )
      .eq("slug", data.slug)
      .single();
    if (error || !company) {
      throw new Error(`Company not found: ${data.slug}`);
    }
    const { data: officials } = await supabase
      .from("officials")
      .select("person_name, position_en, position_el")
      .eq("slug", data.slug)
      .order("position_en", { ascending: true });
    return { company, officials: officials ?? [] };
  });

export const searchCompanies = createServerFn({ method: "GET" })
  .validator((data: { q: string; page: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const q = data.q.trim().slice(0, 100);
    const page = Math.max(1, data.page);
    let rows: CompanyListItem[] = [];
    let count = 0;
    if (!q) {
      const res = await supabase
        .from("companies")
        .select("slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality", { count: "exact" })
        .order("name", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      rows = (res.data ?? []) as CompanyListItem[];
      count = res.count ?? 0;
    } else {
      const idMatch = q.replace(/\s+/g, "").toUpperCase();
      const isIdLike = /^(HE|EE|AE|BN|S|C|B|P|O|N)?\d+$/.test(idMatch);
      const select =
        "slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality" as const;
      if (isIdLike) {
        const digits = idMatch.replace(/^\D+/, "");
        const res = await supabase
          .from("companies")
          .select(select, { count: "exact" })
          .or(`official_no.eq.${idMatch},slug.eq.${idMatch},reg_number.eq.${digits}`)
          .order("name", { ascending: true })
          .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
        rows = (res.data ?? []) as CompanyListItem[];
        count = res.count ?? 0;
      } else {
        const res = await supabase
          .from("companies")
          .select(select, { count: "exact" })
          .ilike("name", `%${q}%`)
          .order("name", { ascending: true })
          .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
        rows = (res.data ?? []) as CompanyListItem[];
        count = res.count ?? 0;
      }
    }

    return { rows, count };
  });

export const listCompaniesByLetter = createServerFn({ method: "GET" })
  .validator((data: { letter: string; page: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const letter = data.letter.toUpperCase().replace(/[^A-Z]/g, "");
    if (!letter) throw new Error("Invalid letter");
    const page = Math.max(1, data.page);
    const res = await supabase
      .from("companies")
      .select("slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality", { count: "exact" })
      .ilike("name", `${letter}%`)
      .order("name", { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    return { rows: (res.data ?? []) as CompanyListItem[], count: res.count ?? 0 };
  });

export const listCompaniesByDistrict = createServerFn({ method: "GET" })
  .validator((data: { district: string; page: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const district = data.district.trim();
    if (!district) throw new Error("Invalid district");
    const page = Math.max(1, data.page);
    const res = await supabase
      .from("companies")
      .select("slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality", { count: "exact" })
      .eq("district_en", district)
      .order("name", { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    return { rows: (res.data ?? []) as CompanyListItem[], count: res.count ?? 0 };
  });

export const getDistricts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const { data: rows, error } = await supabase
    .from("companies")
    .select("district_en")
    .not("district_en", "is", null)
    .order("district_en", { ascending: true });
  if (error) throw error;
  const map = new Map<string, number>();
  for (const r of rows ?? []) {
    if (!r.district_en) continue;
    map.set(r.district_en, (map.get(r.district_en) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export const getCompanyCount = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const { count, error } = await supabase.from("companies").select("*", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
});

export const getSitemapChunk = createServerFn({ method: "GET" })
  .validator((data: { n: number }) => data)
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
