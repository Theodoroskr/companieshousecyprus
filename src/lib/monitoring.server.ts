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
export const MONITORING_RENEWAL_SLUG = "monitoring-renewal";
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

/**
 * Extend the customer's existing entitlement by twelve months for each paid
 * monitoring-renewal item. The extra year is added on top of the current
 * cover end date (or from now if the plan has lapsed), watched companies
 * carry over, and their cover dates move with the plan. If no entitlement
 * exists yet, a fresh one is created instead.
 */
export async function renewEntitlementsForOrder(orderId: string) {
  const supabase = client();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, email")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return;

  const { data: items } = await supabase
    .from("order_items")
    .select("id, product_slug, quantity, fulfilment_status")
    .eq("order_id", orderId)
    .eq("product_slug", MONITORING_RENEWAL_SLUG);

  for (const item of items ?? []) {
    if (item.fulfilment_status === "delivered") continue;

    const { data: entitlement } = await supabase
      .from("monitoring_entitlements")
      .select("id, expires_at, watch_limit")
      .or(order.user_id ? `user_id.eq.${order.user_id},email.eq.${order.email}` : `email.eq.${order.email}`)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!entitlement) {
      // No plan to renew — create a fresh entitlement so the customer still
      // gets what they paid for.
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      const { error } = await supabase.from("monitoring_entitlements").insert({
        user_id: order.user_id,
        email: order.email,
        status: "active",
        watch_limit: MONITORING_WATCH_LIMIT * Math.max(1, item.quantity),
        order_id: order.id,
        order_item_id: item.id,
        expires_at: expiresAt,
      });
      await supabase
        .from("order_items")
        .update(
          error
            ? { fulfilment_status: "failed", fulfilment_message: error.message }
            : {
                fulfilment_status: "delivered",
                fulfilment_message: `Monitoring plan started (no existing plan found) — active until ${new Date(expiresAt).toLocaleDateString("en-GB")}`,
                delivered_at: new Date().toISOString(),
              },
        )
        .eq("id", item.id);
      continue;
    }

    const base = Math.max(Date.now(), new Date(entitlement.expires_at).getTime());
    const newExpiresAt = new Date(base + 365 * 24 * 60 * 60 * 1000 * Math.max(1, item.quantity)).toISOString();
    const { error } = await supabase
      .from("monitoring_entitlements")
      .update({ status: "active", expires_at: newExpiresAt, updated_at: new Date().toISOString() })
      .eq("id", entitlement.id);

    if (error) {
      await supabase
        .from("order_items")
        .update({ fulfilment_status: "failed", fulfilment_message: error.message })
        .eq("id", item.id);
      continue;
    }

    // Move the cover end date of this plan's watches with the renewal.
    await supabase
      .from("company_watches")
      .update({ status: "active", expires_at: newExpiresAt, updated_at: new Date().toISOString() })
      .eq("entitlement_id", entitlement.id)
      .eq("status", "active");

    await supabase
      .from("order_items")
      .update({
        fulfilment_status: "delivered",
        fulfilment_message: `Monitoring renewed — cover extended until ${new Date(newExpiresAt).toLocaleDateString("en-GB")}`,
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
export async function runMonitoringCheck(options?: { watchId?: string }) {
  const supabase = client();
  const now = new Date().toISOString();

  let query = supabase
    .from("company_watches")
    .select("id, user_id, email, company_slug, company_name, company_number, last_alert_at")
    .eq("status", "active");
  if (options?.watchId) query = query.eq("id", options.watchId);
  const { data: watches, error } = await query;
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
        // Fall back to the account email when the watch row has none stored.
        let recipient = watch.email as string | null;
        if (!recipient && watch.user_id) {
          const { data: account } = await supabase.auth.admin.getUserById(watch.user_id);
          recipient = account?.user?.email ?? null;
          if (recipient) {
            await supabase.from("company_watches").update({ email: recipient }).eq("id", watch.id);
          }
        }

        const willEmail = alertable.length > 0 && Boolean(recipient);
        const rows = changes.map((change) => ({
          watch_id: watch.id,
          change_type: change.change_type,
          field_label: change.field_label,
          previous_value: change.previous_value,
          new_value: change.new_value,
          emailed_at: willEmail ? now : null,
        }));
        await supabase.from("company_watch_alerts").insert(rows);

        if (willEmail && recipient) {
          try {
            const result = await sendTemplateEmail("company-watch-alert", recipient, {
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
            if (result?.sent) {
              await supabase
                .from("company_watches")
                .update({ last_alert_at: now })
                .eq("id", watch.id);
              alerted += 1;
            } else {
              // Suppressed recipient: stop retrying, but record that nothing was delivered.
              console.warn("Watch alert not delivered", watch.id, result?.reason);
              await supabase
                .from("company_watch_alerts")
                .update({ emailed_at: null })
                .eq("watch_id", watch.id)
                .eq("emailed_at", now);
              await supabase
                .from("company_watches")
                .update({ last_alert_at: now })
                .eq("id", watch.id);
            }
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

  // Expire entitlements and watches past their end date (skipped for
  // single-watch manual checks — the expiry sweep belongs to the daily run).
  if (!options?.watchId) {
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
  }

  return { ok: true as const, checked, alerted };
}

/**
 * Sends a sample monitoring alert to one recipient so staff can verify the
 * email pipeline end to end without waiting for a real registry change.
 */
export async function sendTestMonitoringAlert(recipient: string) {
  const result = await sendTemplateEmail("company-watch-alert", recipient, {
    idempotencyKey: `watch-alert-test-${Date.now()}`,
    sendOfficeCopy: true,
    templateData: {
      company: "ADRANUS INVESTMENTS LIMITED · HE327816",
      changes: [
        { field: "Registry status", previous: "Active", current: "Active (test alert)" },
        { field: "Registered address", previous: "Old address, Nicosia", current: "New address, Nicosia" },
      ],
      companyUrl: `${SITE_URL}/company/adranus-investments-limited`,
      accountUrl: `${SITE_URL}/account/monitoring`,
    },
  });
  const reason = result && "reason" in result ? (result as { reason?: string }).reason ?? null : null;
  return { ok: Boolean(result?.sent), reason };
}

/* ------------------------------------------------------------------ */
/* Admin / support back-office helpers. Callers must verify the user  */
/* with assertSupport() before invoking any of these.                 */
/* ------------------------------------------------------------------ */

export type AdminEntitlement = {
  id: string;
  email: string;
  user_id: string | null;
  status: string;
  watch_limit: number;
  expires_at: string;
  created_at: string;
  order_reference: string | null;
  watches_used: number;
  alerts_sent: number;
};

export type AdminWatch = {
  id: string;
  entitlement_id: string | null;
  email: string;
  company_slug: string;
  company_name: string;
  company_number: string | null;
  status: string;
  expires_at: string;
  started_at: string;
  last_checked_at: string | null;
  last_alert_at: string | null;
  registry_status: string | null;
  alert_count: number;
  undelivered_count: number;
};

export type AdminAlert = {
  id: string;
  watch_id: string;
  company_name: string;
  customer_email: string;
  field_label: string;
  change_type: string;
  previous_value: string | null;
  new_value: string | null;
  detected_at: string;
  emailed_at: string | null;
};

export async function adminMonitoringData(): Promise<{
  entitlements: AdminEntitlement[];
  watches: AdminWatch[];
  alerts: AdminAlert[];
}> {
  const supabase = client();

  const [{ data: entitlements }, { data: watches }, { data: alerts }] = await Promise.all([
    supabase
      .from("monitoring_entitlements")
      .select("id, email, user_id, status, watch_limit, expires_at, created_at, order_id")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("company_watches")
      .select("id, entitlement_id, email, company_slug, company_name, company_number, status, expires_at, started_at, last_checked_at, last_alert_at")
      .order("created_at", { ascending: false })
      .limit(1000),
    supabase
      .from("company_watch_alerts")
      .select("id, watch_id, field_label, change_type, previous_value, new_value, detected_at, emailed_at")
      .order("detected_at", { ascending: false })
      .limit(500),
  ]);

  const orderIds = Array.from(new Set((entitlements ?? []).map((e) => e.order_id).filter(Boolean))) as string[];
  const { data: orders } = orderIds.length
    ? await supabase.from("orders").select("id, reference").in("id", orderIds)
    : { data: [] as { id: string; reference: string }[] };
  const orderRef = new Map((orders ?? []).map((o) => [o.id, o.reference]));

  const slugs = Array.from(new Set((watches ?? []).map((w) => w.company_slug)));
  const { data: companies } = slugs.length
    ? await supabase.from("companies").select("slug, status_en").in("slug", slugs)
    : { data: [] as { slug: string; status_en: string | null }[] };
  const statusBySlug = new Map((companies ?? []).map((c) => [c.slug, c.status_en]));

  const watchRows = watches ?? [];
  const watchById = new Map(watchRows.map((w) => [w.id, w]));
  const alertRows = alerts ?? [];

  const alertsByWatch = new Map<string, typeof alertRows>();
  for (const alert of alertRows) {
    const list = alertsByWatch.get(alert.watch_id) ?? [];
    list.push(alert);
    alertsByWatch.set(alert.watch_id, list);
  }

  return {
    entitlements: (entitlements ?? []).map((e) => {
      const own = watchRows.filter((w) => w.entitlement_id === e.id);
      const ownAlerts = own.flatMap((w) => alertsByWatch.get(w.id) ?? []);
      return {
        id: e.id,
        email: e.email,
        user_id: e.user_id,
        status: e.status,
        watch_limit: e.watch_limit,
        expires_at: e.expires_at,
        created_at: e.created_at,
        order_reference: e.order_id ? (orderRef.get(e.order_id) ?? null) : null,
        watches_used: own.filter((w) => w.status === "active").length,
        alerts_sent: ownAlerts.filter((a) => a.emailed_at).length,
      };
    }),
    watches: watchRows.map((w) => {
      const own = alertsByWatch.get(w.id) ?? [];
      return {
        id: w.id,
        entitlement_id: w.entitlement_id,
        email: w.email,
        company_slug: w.company_slug,
        company_name: w.company_name,
        company_number: w.company_number,
        status: w.status,
        expires_at: w.expires_at,
        started_at: w.started_at,
        last_checked_at: w.last_checked_at,
        last_alert_at: w.last_alert_at,
        registry_status: statusBySlug.get(w.company_slug) ?? null,
        alert_count: own.length,
        undelivered_count: own.filter((a) => !a.emailed_at).length,
      };
    }),
    alerts: alertRows.map((a) => {
      const watch = watchById.get(a.watch_id);
      return {
        id: a.id,
        watch_id: a.watch_id,
        company_name: watch?.company_name ?? "Unknown company",
        customer_email: watch?.email ?? "",
        field_label: a.field_label,
        change_type: a.change_type,
        previous_value: a.previous_value,
        new_value: a.new_value,
        detected_at: a.detected_at,
        emailed_at: a.emailed_at,
      };
    }),
  };
}

/** Manually extend a plan's cover by N months (from its current end date). */
export async function adminExtendEntitlement(entitlementId: string, months: number) {
  const supabase = client();
  const { data: ent } = await supabase
    .from("monitoring_entitlements")
    .select("id, expires_at, status")
    .eq("id", entitlementId)
    .maybeSingle();
  if (!ent) throw new Error("Plan not found");

  const base = Math.max(Date.now(), new Date(ent.expires_at).getTime());
  const newExpiry = new Date(base);
  newExpiry.setMonth(newExpiry.getMonth() + months);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("monitoring_entitlements")
    .update({ status: "active", expires_at: newExpiry.toISOString(), updated_at: now })
    .eq("id", ent.id);
  if (error) throw new Error(error.message);

  await supabase
    .from("company_watches")
    .update({ status: "active", expires_at: newExpiry.toISOString(), updated_at: now })
    .eq("entitlement_id", ent.id)
    .in("status", ["active", "expired"]);

  return { ok: true as const, expires_at: newExpiry.toISOString() };
}

/** Cancel a plan and stop its watches (watches keep their history). */
export async function adminCancelEntitlement(entitlementId: string) {
  const supabase = client();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("monitoring_entitlements")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", entitlementId);
  if (error) throw new Error(error.message);
  await supabase
    .from("company_watches")
    .update({ status: "cancelled", updated_at: now })
    .eq("entitlement_id", entitlementId)
    .eq("status", "active");
  return { ok: true as const };
}

/** Stop a single watch on behalf of the customer. */
export async function adminStopWatch(watchId: string) {
  const supabase = client();
  const { error } = await supabase
    .from("company_watches")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", watchId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Re-send the most recent undelivered alert email for a watch. */
export async function adminResendWatchAlert(watchId: string) {
  const supabase = client();
  const { data: watch } = await supabase
    .from("company_watches")
    .select("id, user_id, email, company_slug, company_name, company_number")
    .eq("id", watchId)
    .maybeSingle();
  if (!watch) throw new Error("Watch not found");

  const { data: pending } = await supabase
    .from("company_watch_alerts")
    .select("id, field_label, previous_value, new_value, detected_at")
    .eq("watch_id", watchId)
    .is("emailed_at", null)
    .order("detected_at", { ascending: false })
    .limit(20);
  if (!pending || pending.length === 0) {
    return { ok: false as const, reason: "No undelivered alerts for this watch" };
  }

  let recipient = watch.email as string | null;
  if (!recipient && watch.user_id) {
    const { data: account } = await supabase.auth.admin.getUserById(watch.user_id);
    recipient = account?.user?.email ?? null;
  }
  if (!recipient) return { ok: false as const, reason: "No recipient email on the watch" };

  const result = await sendTemplateEmail("company-watch-alert", recipient, {
    idempotencyKey: `watch-alert-resend-${watchId}-${Date.now()}`,
    sendOfficeCopy: true,
    templateData: {
      company: [watch.company_name, watch.company_number].filter(Boolean).join(" · "),
      changes: pending.map((a) => ({
        field: a.field_label,
        previous: a.previous_value || "—",
        current: a.new_value || "—",
      })),
      companyUrl: `${SITE_URL}/company/${watch.company_slug}`,
      accountUrl: `${SITE_URL}/account/monitoring`,
    },
  });

  if (result?.sent) {
    const now = new Date().toISOString();
    await supabase
      .from("company_watch_alerts")
      .update({ emailed_at: now })
      .in("id", pending.map((a) => a.id));
    return { ok: true as const, reason: null };
  }
  const reason = result && "reason" in result ? String((result as { reason?: string }).reason ?? "send failed") : "send failed";
  return { ok: false as const, reason };
}
