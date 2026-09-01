import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { normalizeCompanySlug, storedSlugCandidates } from "@/lib/slug";
import { normaliseCompanyKey } from "@/lib/registrar-mapping";

import { searchVariants } from "@/lib/format";
import { cached } from "@/lib/server-cache";

const PAGE_SIZE = 50;
// Cap on how many matching rows the search helper materialises before
// sorting/counting: unbounded ORDER BY + exact COUNT over 570k+ rows
// exceeds the Postgres statement timeout on common terms.
const SEARCH_CANDIDATE_CAP = 2_000;
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
  "slug" | "canonical_slug" | "type_code" | "name" | "official_no" | "reg_number" | "status_en" | "status_group" | "district_en" | "locality"
>;

const COMPANY_COLUMNS =
  "slug, canonical_slug, type_code, name, official_no, reg_number, registration_date, status_en, status_group, status_date, type_en, subtype_en, address_full, building, street, locality, district_el, district_en, postcode, is_foreign_address, report_years, officials_count, updated_at";

/**
 * Resolve any incoming company URL slug to the stored registry key.
 * Accepts the ID form ("C4404" / "he4404"), the canonical name-based form
 * ("infocredit-group-limited-he4404") and any previously published name-based
 * slug recorded in `company_slug_history`.
 */
async function resolveStoredSlug(
  supabase: ReturnType<typeof getServerClient>,
  input: string,
): Promise<string | null> {
  // Slug → registry key is a stable mapping and is resolved up to three times
  // per company page render (profile, related, similar), so memoise it.
  return cached(`slugkey:${input}`, 60 * 60_000, async () => {
    const candidates = storedSlugCandidates(input, (v) => normaliseCompanyKey("", v)?.slug ?? null);

    if (candidates.length > 0) {
      const { data } = await supabase.from("companies").select("slug").in("slug", candidates).limit(1);
      if (data?.[0]?.slug) return data[0].slug;
    }
    // Fall back to the canonical / historic name-based slug lookup.
    const { data: resolved } = await supabase.rpc("resolve_company_slug", {
      _input: (input ?? "").trim().toLowerCase(),
    });
    return (resolved as string | null) ?? null;
  });
}

export const getCompanyBySlug = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) =>
    // The company row, its officials (accounts/filings years included) are
    // identical for every visitor: memoise the whole payload per isolate so a
    // repeat render never touches the backend.
    cached(`company:${data.slug}`, 15 * 60_000, async () => {
      const supabase = getServerClient();
      const slug = await resolveStoredSlug(supabase, data.slug);
      if (!slug) throw new Error(`Company not found: ${data.slug}`);
      const [{ data: company, error }, { data: officials }] = await Promise.all([
        supabase.from("companies").select(COMPANY_COLUMNS).eq("slug", slug).single(),
        // Officials come through the RPC so GDPR-suppressed names are withheld
        // server-side and never reach the SSR HTML.
        supabase.rpc("company_officials_public", { p_slug: slug }),
      ]);
      if (error || !company) {
        throw new Error(`Company not found: ${data.slug}`);
      }
      return { company, officials: officials ?? [] };
    }),
  );



export const getRelatedCompanies = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) =>
    // Same-address / shared-officer lookups are identical for every visitor and
    // were the single biggest source of repeated database CPU, so they are
    // memoised per company for 30 minutes.
    cached(`related:${data.slug}`, 30 * 60_000, async () => {
    const supabase = getServerClient();
    // Callers pass the canonical name-based slug, so resolve it to the stored
    // registry key exactly like getCompanyBySlug does.
    const slug = (await resolveStoredSlug(supabase, data.slug)) ?? normalizeCompanySlug(data.slug);

    const select =
      "slug, canonical_slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality" as const;

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

    // Suppressed names are excluded so they can never surface as a
    // "shared official" link on another company page.
    const { data: own } = await supabase.rpc("company_official_names_public", {
      p_slug: slug,
      p_limit: 20,
    });
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
    }),
  );

// SSR "People also viewed": same district and entity type, so the strip is
// indexable internal linking between company profiles (not personalised).
export const getSimilarCompanies = createServerFn({ method: "GET" })
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) =>
    cached(`similar:${data.slug}`, 30 * 60_000, async () => {
      const supabase = getServerClient();
      const slug = (await resolveStoredSlug(supabase, data.slug)) ?? normalizeCompanySlug(data.slug);

      const { data: base } = await supabase
        .from("companies")
        .select("slug, district_en, type_code")
        .eq("slug", slug)
        .single();
      if (!base?.district_en || !base.type_code) return { similar: [] as CompanyListItem[] };

      const { data: rows } = await supabase
        .from("companies")
        .select("slug, canonical_slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality")
        .eq("district_en", base.district_en)
        .eq("type_code", base.type_code)
        .neq("slug", slug)
        .order("name", { ascending: true })
        .limit(9);

      return { similar: (rows ?? []) as CompanyListItem[] };
    }),
  );



const COMPANY_TYPE_CODES = ["C", "B", "P", "O", "N"] as const;
const COMPANY_STATUS_GROUPS = [
  "active",
  "at_risk",
  "struck_off",
  "dissolved",
  "liquidation",
  "other",
] as const;

export const searchCompanies = createServerFn({ method: "GET" })
  .validator((data: { q: string; page: number; types?: string[]; statuses?: string[] }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const q = data.q.trim().slice(0, 100);
    const page = Math.max(1, data.page);
    const types = (data.types ?? []).filter((t): t is (typeof COMPANY_TYPE_CODES)[number] =>
      (COMPANY_TYPE_CODES as readonly string[]).includes(t),
    );
    const statuses = (data.statuses ?? []).filter((s): s is (typeof COMPANY_STATUS_GROUPS)[number] =>
      (COMPANY_STATUS_GROUPS as readonly string[]).includes(s),
    );
    const select =
      "slug, canonical_slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality" as const;

    const build = () => {
      let query = supabase.from("companies").select(select, { count: "exact" });
      if (types.length > 0) query = query.in("type_code", types);
      if (statuses.length > 0) query = query.in("status_group", statuses);
      return query;
    };

    let rows: CompanyListItem[] = [];
    let count = 0;
    let capped = false;

    const idMatch = q.replace(/\s+/g, "").toUpperCase();
    const isIdLike = q.length > 0 && /^(HE|EE|AE|BN|S|C|B|P|O|N)?\d+$/.test(idMatch);

    if (isIdLike) {
      const digits = idMatch.replace(/^\D+/, "");
      const res = await build()
        .or(`official_no.eq.${idMatch},slug.eq.${idMatch},reg_number.eq.${digits}`)
        .order("name", { ascending: true })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
      rows = (res.data ?? []) as CompanyListItem[];
      count = res.count ?? 0;
    } else {
      // Name / browse queries run through a capped-candidate SQL helper:
      // exact counts and full ORDER BY over 570k+ rows blow the Postgres
      // statement timeout on common terms like "limited".
      // Match the raw term plus its transliterated form, so Greek-script
      // queries also find the Latin-script registry names.
      const variants = q
        ? searchVariants(q).map((v) => v.replace(/[,()*%]/g, " ").trim()).filter(Boolean)
        : [];
      const patterns = q ? (variants.length > 0 ? variants : [q]).map((v) => `%${v}%`) : null;
      const args = {
        p_patterns: patterns,
        p_types: types.length > 0 ? types : null,
        p_statuses: statuses.length > 0 ? statuses : null,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
        p_cap: SEARCH_CANDIDATE_CAP,
      } as unknown as Parameters<typeof supabase.rpc<"search_companies_page">>[1];
      const { data: res, error } = await supabase.rpc("search_companies_page", args);
      if (error) throw error;
      const list = (res ?? []) as Array<CompanyListItem & { total_matches: number; capped: boolean }>;
      rows = list.map(({ total_matches: _t, capped: _c, ...rest }) => rest as CompanyListItem);
      count = list[0]?.total_matches ?? 0;
      capped = Boolean(list[0]?.capped);
    }

    return { rows, count, capped };
  });

export const listCompaniesByLetter = createServerFn({ method: "GET" })
  .validator((data: { letter: string; page: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const letter = data.letter.toUpperCase().replace(/[^A-Z]/g, "");
    if (!letter) throw new Error("Invalid letter");
    const page = Math.max(1, data.page);
    // Listing pages are identical for every visitor: cache the resolved page
    // per worker isolate so a backend latency blip cannot land on TTFB.
    return cached(`letter:${letter[0]}:${page}`, 5 * 60_000, async () => {
      // ILIKE 'X%' cannot use the (upper(left(name,1)), name) index and took
      // ~18s per page; the helper filters on the indexed expression instead.
      const { data: res, error } = await supabase.rpc("companies_by_letter_page", {
        p_letter: letter[0]!,
        p_limit: PAGE_SIZE,
        p_offset: (page - 1) * PAGE_SIZE,
      });
      if (error) throw error;
      const list = (res ?? []) as Array<CompanyListItem & { total_matches: number }>;
      return {
        rows: list.map(({ total_matches: _t, ...rest }) => rest as CompanyListItem),
        count: Number(list[0]?.total_matches ?? 0),
      };
    });
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
      .select(
        "slug, canonical_slug, type_code, name, official_no, reg_number, status_en, status_group, district_en, locality",
        { count: "exact" },
      )
      .eq("district_en", district)
      .order("name", { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    return { rows: (res.data ?? []) as CompanyListItem[], count: res.count ?? 0 };
  });

export const getDistricts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  // Aggregated in SQL: streaming every district_en row to the app both
  // truncated at the PostgREST 1,000-row cap and risked a statement timeout.
  const { data, error } = await supabase.rpc("companies_district_counts");
  if (error) throw error;
  return ((data ?? []) as Array<{ name: string; count: number }>)
    .map((r) => ({ name: r.name, count: Number(r.count) }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

/**
 * Row count of `companies`.
 *
 * An exact COUNT(*) over 570k+ rows is a parallel sequential scan and was by
 * far the heaviest recurring query on the database. The count is only ever
 * displayed as a rounded "571,000+" figure, so it reads the planner statistic
 * instead and is cached per worker for an hour.
 */
async function readCompanyCount(): Promise<number | null> {
  return cached("stats:companyCount", 60 * 60_000, async () => {
    const supabase = getServerClient();
    const { data, error } = await supabase.rpc("companies_row_estimate");
    if (error) throw new Error(error.message);
    const value = Number(data);
    return Number.isFinite(value) && value > 0 ? value : null;
  });
}

export const getCompanyCount = createServerFn({ method: "GET" }).handler(async () => {
  try {
    return await readCompanyCount();
  } catch (error) {
    // The count is decorative. Bulk imports can briefly put the database under
    // enough load for the read to fail; that must not blank the home page.
    console.error(error);
    return null;
  }
});

/**
 * Central registry statistics used anywhere the site shows "how many entities
 * do we cover" and "when was that data last refreshed".
 *
 * Never throws: a database hiccup returns nulls so callers can degrade to a
 * label instead of breaking the page or printing a stale/false figure.
 */
export const getRegistryStats = createServerFn({ method: "GET" }).handler(async () =>
  cached("stats:registry", 15 * 60_000, async () => {
    let count: number | null = null;
    let lastRefresh: string | null = null;
    try {
      const supabase = getServerClient();
      const [countRes, importRes, updatedRes] = await Promise.all([
        readCompanyCount().catch(() => null),
        supabase
          .from("import_runs")
          .select("finished_at")
          .eq("status", "completed")
          .not("finished_at", "is", null)
          .order("finished_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("companies")
          .select("updated_at")
          .not("updated_at", "is", null)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      count = countRes;
      lastRefresh =
        (!importRes.error && importRes.data?.finished_at) ||
        (!updatedRes.error && updatedRes.data?.updated_at) ||
        null;
    } catch {
      // Fall through with nulls — statistics are decorative, never load-bearing.
    }
    return { count, lastRefresh };
  }),
);


/**
 * First slug of a sitemap chunk. Resolving it needs one deep OFFSET scan, which
 * was one of the most expensive recurring queries, so the boundary slug (a few
 * bytes) is memoised per worker rather than the whole 50k-row chunk.
 */
async function sitemapChunkStartSlug(
  supabase: ReturnType<typeof getServerClient>,
  n: number,
): Promise<string | null> {
  if (n === 0) return null;
  return cached(`sitemap:start:${n}`, 6 * 60 * 60_000, async () => {
    const { data, error } = await supabase
      .from("companies")
      .select("slug")
      .order("slug", { ascending: true })
      .range(n * SITEMAP_CHUNK_SIZE - 1, n * SITEMAP_CHUNK_SIZE - 1);
    if (error) throw error;
    return data?.[0]?.slug ?? null;
  });
}

export const getSitemapChunk = createServerFn({ method: "GET" })
  .validator((data: { n: number }) => data)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const n = Math.max(0, data.n);
    // PostgREST caps a single response at 1,000 rows, so the chunk is filled
    // by paging internally with a keyset cursor on the slug primary key.
    const PAGE = 1_000;
    const rows: { slug: string; canonicalSlug: string; lastmod: string | null }[] = [];
    let cursor: string | null = await sitemapChunkStartSlug(supabase, n);
    if (n > 0 && !cursor) return { n, rows, hasMore: false };

    while (rows.length < SITEMAP_CHUNK_SIZE) {
      const limit = Math.min(PAGE, SITEMAP_CHUNK_SIZE - rows.length);
      let query = supabase
        .from("companies")
        .select("slug, canonical_slug, content_updated_at")
        .order("slug", { ascending: true })
        .limit(limit);
      if (cursor) query = query.gt("slug", cursor);

      const { data: page, error } = await query;
      if (error) throw error;
      const batch = page ?? [];
      for (const r of batch) {
        rows.push({
          slug: r.slug,
          canonicalSlug: r.canonical_slug ?? r.slug,
          lastmod: r.content_updated_at ?? null,
        });
      }
      if (batch.length < limit) break;
      cursor = batch[batch.length - 1]!.slug;
    }


    return {
      n,
      rows,
      hasMore: rows.length === SITEMAP_CHUNK_SIZE,
    };
  });


export const getSitemapIndex = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const { data, error } = await supabase
    .from("sitemap_chunks")
    .select("chunk_index, url_count, lastmod, refreshed_at")
    .order("chunk_index", { ascending: true });
  if (error) throw error;

  const chunks = (data ?? []).map((row) => ({
    index: row.chunk_index,
    urlCount: row.url_count,
    lastmod: row.lastmod,
    refreshedAt: row.refreshed_at as string | null,
  }));

  if (chunks.length > 0) return { chunks, source: "metadata" as const };

  // Fallback: the freshness table has not been populated yet, so derive the
  // chunk count directly. No lastmod is emitted in that case.
  const { count, error: countError } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });
  if (countError) throw countError;
  const total = Math.max(1, Math.ceil((count ?? 0) / SITEMAP_CHUNK_SIZE));
  return {
    chunks: Array.from({ length: total }, (_, i) => ({
      index: i,
      urlCount: 0,
      lastmod: null as string | null,
      refreshedAt: null as string | null,
    })),
    source: "fallback" as const,
  };
});

