import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCompanySlug } from "@/lib/slug";

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

// Registry data is no longer exposed through the public Data API: the
// `companies` and `officials` tables have no anon/authenticated SELECT
// policies. All public reads go through these server functions, which run
// server-side only and project explicit safe columns.
function getServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
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
    const slug = normalizeCompanySlug(data.slug);
    const { data: company, error } = await supabase
      .from("companies")
      .select(
        "slug, type_code, name, official_no, reg_number, registration_date, status_en, status_group, status_date, type_en, subtype_en, address_full, building, street, locality, district_el, district_en, postcode, is_foreign_address, report_years, officials_count, updated_at",
      )
      .eq("slug", slug)
      .single();
    if (error || !company) {
      throw new Error(`Company not found: ${data.slug}`);
    }
    const { data: officials } = await supabase
      .from("officials")
      .select("person_name, position_en, position_el")
      .eq("slug", slug)
      .order("position_en", { ascending: true });
    return { company, officials: officials ?? [] };
  });

export const getRelatedCompanies = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const slug = normalizeCompanySlug(data.slug);
    const select =
      "slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality" as const;

    const { data: base } = await supabase
      .from("companies")
      .select("slug, address_full")
      .eq("slug", slug)
      .single();

    let byAddress: CompanyListItem[] = [];
    let addressCount = 0;
    if (base?.address_full) {
      const res = await supabase
        .from("companies")
        .select(select, { count: "exact" })
        .eq("address_full", base.address_full)
        .neq("slug", slug)
        .order("name", { ascending: true })
        .limit(8);
      byAddress = (res.data ?? []) as CompanyListItem[];
      addressCount = res.count ?? byAddress.length;
    }

    const { data: own } = await supabase
      .from("officials")
      .select("person_name")
      .eq("slug", slug)
      .limit(20);
    const names = Array.from(
      new Set((own ?? []).map((o) => o.person_name).filter((n): n is string => Boolean(n && n.trim()))),
    ).slice(0, 8);

    let byOfficial: Array<CompanyListItem & { via: string }> = [];
    if (names.length > 0) {
      const { data: links } = await supabase
        .from("officials")
        .select("slug, person_name")
        .in("person_name", names)
        .neq("slug", slug)
        .limit(60);
      const viaBySlug = new Map<string, string>();
      for (const l of links ?? []) {
        if (l.slug && !viaBySlug.has(l.slug)) viaBySlug.set(l.slug, l.person_name ?? "");
      }
      const slugs = Array.from(viaBySlug.keys()).slice(0, 8);
      if (slugs.length > 0) {
        const { data: rows } = await supabase
          .from("companies")
          .select(select)
          .in("slug", slugs)
          .order("name", { ascending: true });
        byOfficial = ((rows ?? []) as CompanyListItem[]).map((r) => ({
          ...r,
          via: viaBySlug.get(r.slug) ?? "",
        }));
      }
    }

    return { byAddress, addressCount, byOfficial, addressFull: base?.address_full ?? null };
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
    // PostgREST caps a single response at 1,000 rows, so page through the
    // chunk internally until it is full (or the table runs out).
    const PAGE = 1_000;
    const start = n * SITEMAP_CHUNK_SIZE;
    const rows: { slug: string; updated_at: string | null }[] = [];
    while (rows.length < SITEMAP_CHUNK_SIZE) {
      const from = start + rows.length;
      const to = Math.min(from + PAGE, start + SITEMAP_CHUNK_SIZE) - 1;
      const { data: page, error } = await supabase
        .from("companies")
        .select("slug, updated_at")
        .order("slug", { ascending: true })
        .range(from, to);
      if (error) throw error;
      const batch = page ?? [];
      for (const r of batch) rows.push({ slug: r.slug, updated_at: r.updated_at });
      if (batch.length < to - from + 1) break;
    }
    return {
      n,
      rows,
      hasMore: rows.length === SITEMAP_CHUNK_SIZE,
    };
  });

