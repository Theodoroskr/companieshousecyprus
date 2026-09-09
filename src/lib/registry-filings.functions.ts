import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { cached } from "@/lib/server-cache";

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

// Registry tables are not exposed through the public Data API; every public
// read runs here, server-side only, projecting explicit safe columns.
function getServerClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase server env vars");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { fetch: createServerFetch(key) },
  });
}

const WINDOW_DAYS = 45;
const LIST_LIMIT = 60;

export type FilingDay = {
  date: string;
  registrations: number;
  statusChanges: number;
};

export type FilingEntry = {
  slug: string;
  name: string;
  officialNo: string | null;
  typeEn: string | null;
  statusEn: string | null;
  district: string | null;
};

export type FilingsOverview = {
  latestDate: string | null;
  days: FilingDay[];
  totalRegistrations: number;
  totalStatusChanges: number;
};

export type FilingsForDate = {
  date: string;
  registrations: FilingEntry[];
  statusChanges: FilingEntry[];
  registrationCount: number;
  statusChangeCount: number;
};

const dateSchema = z
  .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
  .strict();

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Row = {
  slug: string;
  name: string | null;
  official_no: string | null;
  type_en: string | null;
  status_en: string | null;
  district_en: string | null;
};

function toEntry(row: Row): FilingEntry {
  return {
    slug: row.slug,
    name: row.name ?? row.slug,
    officialNo: row.official_no,
    typeEn: row.type_en,
    statusEn: row.status_en,
    district: row.district_en,
  };
}

/** Daily registry activity for the most recent window covered by the register. */
export const getRegistryFilingsOverview = createServerFn({ method: "GET" }).handler(
  async (): Promise<FilingsOverview> =>
    cached("registry-filings-overview", 6 * 60 * 60_000, async () => {
      const supabase = getServerClient();

      const { data: latestRow } = await supabase
        .from("companies")
        .select("registration_date")
        .not("registration_date", "is", null)
        .order("registration_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const latestDate = (latestRow?.registration_date as string | null) ?? null;
      if (!latestDate) {
        return { latestDate: null, days: [], totalRegistrations: 0, totalStatusChanges: 0 };
      }

      const { data: rows } = await (supabase as any).rpc("registry_filing_days", {
        _window_days: WINDOW_DAYS,
      });

      const days: FilingDay[] = ((rows ?? []) as Array<{
        filing_date: string;
        registrations: number;
        status_changes: number;
      }>)
        .map((row) => ({
          date: row.filing_date,
          registrations: Number(row.registrations ?? 0),
          statusChanges: Number(row.status_changes ?? 0),
        }))
        .sort((a, b) => (a.date < b.date ? 1 : -1));

      return {
        latestDate,
        days,
        totalRegistrations: days.reduce((sum, day) => sum + day.registrations, 0),
        totalStatusChanges: days.reduce((sum, day) => sum + day.statusChanges, 0),
      };
    }),
);

/** Entities registered, and entities whose status changed, on a single date. */
export const getRegistryFilingsForDate = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => dateSchema.parse(data))
  .handler(async ({ data }): Promise<FilingsForDate> =>
    cached(`registry-filings-day:${data.date}`, 6 * 60 * 60_000, async () => {
      const supabase = getServerClient();
      const columns = "slug, name, official_no, type_en, status_en, district_en";

      const [registrations, statusChanges] = await Promise.all([
        supabase
          .from("companies")
          .select(columns, { count: "exact" })
          .eq("registration_date", data.date)
          .order("name", { ascending: true })
          .limit(LIST_LIMIT),
        supabase
          .from("companies")
          .select(columns, { count: "exact" })
          .eq("status_date", data.date)
          .neq("registration_date", data.date)
          .order("name", { ascending: true })
          .limit(LIST_LIMIT),
      ]);

      return {
        date: data.date,
        registrations: ((registrations.data ?? []) as Row[]).map(toEntry),
        statusChanges: ((statusChanges.data ?? []) as Row[]).map(toEntry),
        registrationCount: registrations.count ?? (registrations.data?.length ?? 0),
        statusChangeCount: statusChanges.count ?? (statusChanges.data?.length ?? 0),
      };
    }),
  );
