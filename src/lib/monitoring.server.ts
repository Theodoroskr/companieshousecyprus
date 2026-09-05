/**
 * Company monitoring: entitlement creation after payment and the daily
 * diff job that compares watched companies against the registry and emails
 * alerts. One entitlement (one purchase of `company-monitoring`) covers up to
 * five watched companies for twelve months.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

export const MONITORING_PRODUCT_SLUG = "company-monitoring";
export const MONITORING_WATCH_LIMIT = 5;
const JOB_KEY = "company_monitoring";
const SITE_URL = "https://companieshousecyprus.com";

function client() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) throw new Error("Missing Supabase service credentials");
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

export async function verifyMonitoringSecret(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const supabase = client();
  const { data } = await supabase.from("job_state").select("secret").eq("key", JOB_KEY).maybeSingle();
  const secret = (data as { secret?: string | null } | null)?.secret;
  return !!secret && secret.length === token.length && secret === token;
}

/** Create a monitoring entitlement for each paid company-monitoring item. */
export async function createEntitlementsForOrder(orderId: string) {
  const supabase = client();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, email")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_slug, quantity, fulfilment_status, company_slug, company_name, company_number")
    .eq("order_id", orderId)
    .eq("product_slug", MONITORING_PRODUCT_SLUG);

  for (const item of items ?? []) {
    if (item.fulfilment_status === "delivered") continue;
    // One entitlement per item (quantity multiplies the watch limit).
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: entitlement, error } = await supabase.from("monitoring_entitlements").insert({
      user_id: order.user_id,
      email: order.email,
      status: "active",
      watch_limit: MONITORING_WATCH_LIMIT * Math.max(1, item.quantity),
      order_id: order.id,
      order_item_id: item.id,
      expires_at: expiresAt,
    })
      .select("id")
      .single();
    if (error) {
      await supabase
        .from("order_items")
        .update({ fulfilment_status: "failed", fulfilment_message: error.message })
        .eq("id", item.id);
      continue;
    }

    // If the monitoring was bought from a company page, start watching that
    // company immediately; otherwise the customer chooses from their account.
    if (item.company_slug && entitlement?.id) {
      const { error: watchError } = await supabase.from("company_watches").insert({
        user_id: order.user_id,
        email: order.email,
        company_slug: item.company_slug,
        company_name: item.company_name ?? item.company_slug,
        company_number: item.company_number,
        entitlement_id: entitlement.id,
        expires_at: expiresAt,
      });
      if (watchError) console.error("Auto-watch creation failed", item.id, watchError.message);
    }

    await supabase
      .from("order_items")
      .update({
        fulfilment_status: "delivered",
        fulfilment_message: `Monitoring active for up to ${MONITORING_WATCH_LIMIT * Math.max(1, item.quantity)} companies until ${new Date(expiresAt).toLocaleDateString("en-GB")}`,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", item.id);
  }
}

type CompanyRow = {
  slug: string;
  name: string;
  status_en: string | null;
  address_full: string | null;
};

type SnapshotFields = {
  name: string;
  status: string;
  address: string;
  officers: string[];
};

function normalise(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function fieldsFrom(company: CompanyRow, officers: string[]): SnapshotFields {
  return {
    name: company.name,
    status: company.status_en ?? "",
    address: company.address_full ?? "",
    officers: officers.map((o) => o.trim()).filter(Boolean).sort(),
  };
}

function diffFields(previous: SnapshotFields, current: SnapshotFields) {
  const changes: { change_type: string; field_label: string; previous_value: string; new_value: string }[] = [];
  if (normalise(previous.name) !== normalise(current.name)) {
    changes.push({ change_type: "name", field_label: "Company name", previous_value: previous.name, new_value: current.name });
  }
  if (normalise(previous.status) !== normalise(current.status)) {
    changes.push({ change_type: "status", field_label: "Registry status", previous_value: previous.status, new_value: current.status });
  }
  if (normalise(previous.address) !== normalise(current.address)) {
    changes.push({ change_type: "address", field_label: "Registered office", previous_value: previous.address, new_value: current.address });
  }
  const prevOfficers = new Set(previous.officers.map(normalise));
  const currOfficers = new Set(current.officers.map(normalise));
  const added = current.officers.filter((o) => !prevOfficers.has(normalise(o)));
  const removed = previous.officers.filter((o) => !currOfficers.has(normalise(o)));
  if (added.length > 0) {
    changes.push({ change_type: "officers", field_label: "Officers appointed", previous_value: "", new_value: added.join(", ") });
  }
  if (removed.length > 0) {
    changes.push({ change_type: "officers", field_label: "Officers resigned/removed", previous_value: removed.join(", "), new_value: "" });
  }
  return changes;
}

/**
 * Daily check: for every active watch, compare the company against its stored
 * snapshot, record alerts, refresh the snapshot, and email one alert per watch.
 */
export async function runMonitoringCheck() {
  const supabase = client();
  const now = new Date().toISOString();

  const { data: watches, error } = await supabase
    .from("company_watches")
    .select("id, email, company_slug, company_name, company_number, last_alert_at")
    .eq("status", "active");
  if (error) return { ok: false as const, error: error.message };

  let checked = 0;
  let alerted = 0;

  for (const watch of watches ?? []) {
    const { data: company } = await supabase
      .from("companies")
      .select("slug, name, status_en, address_full")
      .eq("slug", watch.company_slug)
      .maybeSingle();
    if (!company) {
      await supabase.from("company_watches").update({ last_checked_at: now }).eq("id", watch.id);
      continue;
    }

    const { data: officerRows } = await supabase
      .from("officials")
      .select("person_name")
      .eq("slug", watch.company_slug);
    const current = fieldsFrom(company as CompanyRow, (officerRows ?? []).map((o) => o.person_name));

    const { data: snapshot } = await supabase
      .from("company_watch_snapshots")
      .select("fields")
      .eq("company_slug", watch.company_slug)
      .maybeSingle();

    const previous = (snapshot?.fields ?? null) as SnapshotFields | null;

    // First sighting: record the snapshot without alerting.
    const snapshotRow: Database["public"]["Tables"]["company_watch_snapshots"]["Insert"] = {
      company_slug: watch.company_slug,
      fields: current as unknown as Json,
      updated_at: now,
    };
    if (!snapshot) snapshotRow.captured_at = now;
    await supabase.from("company_watch_snapshots").upsert(snapshotRow);

    if (previous) {
      const changes = diffFields(previous, current);
      // One alert email per watch per day at most.
      const alertable = changes.filter(
        (change) => !watch.last_alert_at || new Date(watch.last_alert_at).getTime() < Date.now() - 23 * 60 * 60 * 1000,
      );
      if (changes.length > 0) {
        const rows = changes.map((change) => ({
          watch_id: watch.id,
          change_type: change.change_type,
          field_label: change.field_label,
          previous_value: change.previous_value,
          new_value: change.new_value,
          emailed_at: alertable.length > 0 ? now : null,
        }));
        await supabase.from("company_watch_alerts").insert(rows);

        if (alertable.length > 0 && watch.email) {
          try {
            await sendTemplateEmail("company-watch-alert", watch.email, {
              idempotencyKey: `watch-alert-${watch.id}-${now.slice(0, 10)}`,
              sendOfficeCopy: true,
              templateData: {
                company: [watch.company_name, watch.company_number].filter(Boolean).join(" · "),
                changes: alertable.map((change) => ({
                  field: change.field_label,
                  previous: change.previous_value || "—",
                  current: change.new_value || "—",
                })),
                companyUrl: `${SITE_URL}/company/${watch.company_slug}`,
                accountUrl: `${SITE_URL}/account/monitoring`,
              },
            });
            await supabase
              .from("company_watches")
              .update({ last_alert_at: now })
              .eq("id", watch.id);
            alerted += 1;
          } catch (err) {
            console.error("Watch alert email failed", watch.id, err);
            // Keep emailed_at null so the alert is retried on the next run.
            await supabase
              .from("company_watch_alerts")
              .update({ emailed_at: null })
              .eq("watch_id", watch.id)
              .eq("emailed_at", now);
          }
        }
      }
    }

    await supabase.from("company_watches").update({ last_checked_at: now }).eq("id", watch.id);
    checked += 1;
  }

  // Expire entitlements and watches past their end date.
  await supabase
    .from("monitoring_entitlements")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("expires_at", now);
  await supabase
    .from("company_watches")
    .update({ status: "expired", updated_at: now })
    .eq("status", "active")
    .lt("expires_at", now);

  await supabase
    .from("job_state")
    .upsert({ key: JOB_KEY, last_run_at: now, updated_at: now, paused: false }, { onConflict: "key" });

  return { ok: true as const, checked, alerted };
}
