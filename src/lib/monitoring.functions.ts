import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WatchRow = {
  id: string;
  company_slug: string;
  company_name: string;
  company_number: string | null;
  status: string;
  expires_at: string;
  last_checked_at: string | null;
  registry_status: string | null;
  registry_type: string | null;
  registry_address: string | null;
  alert_count: number;
  last_change_at: string | null;
};

export type AlertRow = {
  id: string;
  watch_id: string;
  field_label: string;
  change_type: string;
  previous_value: string | null;
  new_value: string | null;
  detected_at: string;
};

export type EntitlementRow = {
  id: string;
  status: string;
  watch_limit: number;
  expires_at: string;
  watches_used: number;
};

export type MonitoringOverview = {
  entitlements: EntitlementRow[];
  watches: WatchRow[];
  alerts: AlertRow[];
};

export const getMonitoringOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MonitoringOverview> => {
    const { data: entitlements } = await context.supabase
      .from("monitoring_entitlements")
      .select("id, status, watch_limit, expires_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    const { data: watches } = await context.supabase
      .from("company_watches")
      .select("id, company_slug, company_name, company_number, status, expires_at, last_checked_at, entitlement_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });

    const watchIds = (watches ?? []).map((w) => w.id);
    const slugs = Array.from(new Set((watches ?? []).map((w) => w.company_slug)));

    const { data: companies } = slugs.length
      ? await context.supabase
          .from("companies")
          .select("slug, status_en, type_en, address_full")
          .in("slug", slugs)
      : { data: [] as { slug: string; status_en: string | null; type_en: string | null; address_full: string | null }[] };

    const { data: alerts } = watchIds.length
      ? await context.supabase
          .from("company_watch_alerts")
          .select("id, watch_id, field_label, change_type, previous_value, new_value, detected_at")
          .in("watch_id", watchIds)
          .order("detected_at", { ascending: false })
          .limit(200)
      : { data: [] as AlertRow[] };

    const alertRows = (alerts ?? []) as AlertRow[];
    const companyBySlug = new Map((companies ?? []).map((c) => [c.slug, c]));

    return {
      entitlements: (entitlements ?? []).map((e) => ({
        id: e.id,
        status: e.status,
        watch_limit: e.watch_limit,
        expires_at: e.expires_at,
        watches_used: (watches ?? []).filter(
          (w) => w.entitlement_id === e.id && w.status === "active",
        ).length,
      })),
      watches: (watches ?? []).map(({ entitlement_id: _e, ...w }) => {
        const company = companyBySlug.get(w.company_slug);
        const own = alertRows.filter((a) => a.watch_id === w.id);
        return {
          ...w,
          registry_status: company?.status_en ?? null,
          registry_type: company?.type_en ?? null,
          registry_address: company?.address_full ?? null,
          alert_count: own.length,
          last_change_at: own[0]?.detected_at ?? null,
        };
      }),
      alerts: alertRows,
    };
  });


export const searchCompaniesForWatch = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ query: z.string().min(2).max(120) }).parse(data))
  .handler(async ({ data, context }) => {
    const q = data.query.trim().replace(/[%_]/g, "");
    if (!q) return [];
    const { data: rows } = await context.supabase
      .from("companies")
      .select("slug, name, official_no, status_en")
      .ilike("name", `%${q}%`)
      .order("name", { ascending: true })
      .limit(8);
    return (rows ?? []).map((r) => ({
      slug: r.slug,
      name: r.name,
      number: r.official_no,
      status: r.status_en,
    }));
  });

export const addCompanyWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ slug: z.string().min(1).max(160) }).parse(data))
  .handler(async ({ data, context }) => {
    const email = typeof context.claims["email"] === "string" ? (context.claims["email"] as string) : "";
    if (!email) throw new Error("Your account has no email address.");

    const { data: company } = await context.supabase
      .from("companies")
      .select("slug, name, official_no")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!company) throw new Error("Company not found.");

    const { data: entitlements } = await context.supabase
      .from("monitoring_entitlements")
      .select("id, watch_limit, expires_at")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true });

    if (!entitlements || entitlements.length === 0) {
      throw new Error("No active monitoring plan — purchase Company Monitoring first.");
    }

    let chosen: (typeof entitlements)[number] | null = null;
    for (const ent of entitlements) {
      const { count } = await context.supabase
        .from("company_watches")
        .select("id", { count: "exact", head: true })
        .eq("entitlement_id", ent.id)
        .eq("status", "active");
      if ((count ?? 0) < ent.watch_limit) {
        chosen = ent;
        break;
      }
    }
    if (!chosen) throw new Error("All monitoring slots are in use — cancel a watch to free one up.");

    const { error } = await context.supabase.from("company_watches").insert({
      user_id: context.userId,
      email,
      company_slug: company.slug,
      company_name: company.name,
      company_number: company.official_no,
      entitlement_id: chosen.id,
      expires_at: chosen.expires_at,
    });
    if (error) {
      if (error.code === "23505") throw new Error("You are already monitoring this company.");
      throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const cancelCompanyWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ watchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("company_watches")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", data.watchId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/* ---------------- Admin / support control module ---------------- */

export const adminGetMonitoring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { adminMonitoringData } = await import("@/lib/monitoring.server");
    return adminMonitoringData();
  });

export const adminExtendPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ entitlementId: z.string().uuid(), months: z.number().int().min(1).max(24) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { adminExtendEntitlement } = await import("@/lib/monitoring.server");
    return adminExtendEntitlement(data.entitlementId, data.months);
  });

export const adminCancelPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ entitlementId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { adminCancelEntitlement } = await import("@/lib/monitoring.server");
    return adminCancelEntitlement(data.entitlementId);
  });

export const adminStopCompanyWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ watchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { adminStopWatch } = await import("@/lib/monitoring.server");
    return adminStopWatch(data.watchId);
  });

export const adminTriggerWatchCheck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ watchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { runMonitoringCheck } = await import("@/lib/monitoring.server");
    return runMonitoringCheck({ watchId: data.watchId });
  });

export const adminResendAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ watchId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { adminResendWatchAlert } = await import("@/lib/monitoring.server");
    return adminResendWatchAlert(data.watchId);
  });
