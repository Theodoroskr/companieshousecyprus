import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { CompanyImportRow, OfficialImportRow } from "@/lib/registrar-mapping";

function adminClient() {
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

export async function readAdminContext(userId: string) {
  const supabase = adminClient();
  const { data, error } = await supabase.from("user_roles").select("user_id, role").eq("role", "admin");
  if (error) throw new Error(error.message);
  return {
    isAdmin: (data ?? []).some((r) => r.user_id === userId),
    adminCount: (data ?? []).length,
  };
}

export async function assertAdmin(userId: string) {
  const { isAdmin } = await readAdminContext(userId);
  if (!isAdmin) throw new Error("Forbidden: admin access required");
}

/** One-time bootstrap: the first signed-in user may claim admin when none exists. */
export async function claimFirstAdminForUser(userId: string) {
  const supabase = adminClient();
  const { adminCount, isAdmin } = await readAdminContext(userId);
  if (isAdmin) return { granted: true as const, alreadyAdmin: true };
  if (adminCount > 0) throw new Error("An administrator already exists. Ask them to grant you access.");
  const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
  if (error) throw new Error(error.message);
  return { granted: true as const, alreadyAdmin: false };
}

export async function readStats() {
  const supabase = adminClient();
  const [companies, officials, withOfficials] = await Promise.all([
    supabase.from("companies").select("slug", { count: "exact", head: true }),
    supabase.from("officials").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("slug", { count: "exact", head: true }).gt("officials_count", 0),
  ]);
  return {
    companies: companies.count ?? 0,
    officials: officials.count ?? 0,
    companiesWithOfficials: withOfficials.count ?? 0,
  };
}

export async function createRun(input: {
  kind: string;
  mode: string;
  filename: string;
  userId: string;
}) {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("import_runs")
    .insert({
      kind: input.kind,
      mode: input.mode,
      filename: input.filename.slice(0, 200),
      status: "running",
      created_by: input.userId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not start import run");
  return { runId: data.id };
}

async function bumpRun(runId: string, processed: number, failed: number) {
  const supabase = adminClient();
  const { data } = await supabase
    .from("import_runs")
    .select("rows_processed, rows_failed")
    .eq("id", runId)
    .single();
  await supabase
    .from("import_runs")
    .update({
      rows_processed: (data?.rows_processed ?? 0) + processed,
      rows_failed: (data?.rows_failed ?? 0) + failed,
    })
    .eq("id", runId);
}

export async function upsertCompanies(runId: string, rows: CompanyImportRow[]) {
  if (rows.length === 0) return { inserted: 0, failed: 0 };
  const supabase = adminClient();
  // Deduplicate within the batch: Postgres rejects an upsert touching a row twice.
  const byslug = new Map<string, CompanyImportRow>();
  for (const row of rows) byslug.set(row.slug, row);
  const payload = [...byslug.values()].map((row) => ({ ...row, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from("companies").upsert(payload, { onConflict: "slug" });
  if (error) {
    await bumpRun(runId, 0, payload.length);
    throw new Error(error.message);
  }
  await bumpRun(runId, payload.length, 0);
  return { inserted: payload.length, failed: 0 };
}

export async function insertOfficials(runId: string, rows: OfficialImportRow[]) {
  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  const supabase = adminClient();
  // Only officials whose company exists (the table has an FK on slug).
  const slugs = [...new Set(rows.map((r) => r.slug))];
  const known = new Set<string>();
  for (let i = 0; i < slugs.length; i += 500) {
    const { data, error } = await supabase
      .from("companies")
      .select("slug")
      .in("slug", slugs.slice(i, i + 500));
    if (error) throw new Error(error.message);
    for (const row of data ?? []) known.add(row.slug);
  }
  const payload = rows.filter((r) => known.has(r.slug));
  const skipped = rows.length - payload.length;
  if (payload.length > 0) {
    const { error } = await supabase.from("officials").insert(payload);
    if (error) {
      await bumpRun(runId, 0, rows.length);
      throw new Error(error.message);
    }
  }
  await bumpRun(runId, payload.length, skipped);
  return { inserted: payload.length, skipped };
}

export async function truncateOfficials() {
  const supabase = adminClient();
  const { error } = await supabase.rpc("clear_officials");
  if (error) throw new Error(error.message);
  return { cleared: true as const };
}

export async function runRefreshOfficialsCount() {
  const supabase = adminClient();
  const { data, error } = await supabase.rpc("refresh_officials_count");
  if (error) throw new Error(error.message);
  return { updated: (data as number | null) ?? 0 };
}

export async function closeRun(runId: string, status: "completed" | "failed", message: string | null) {
  const supabase = adminClient();
  const { error } = await supabase
    .from("import_runs")
    .update({ status, message: message?.slice(0, 1000) ?? null, finished_at: new Date().toISOString() })
    .eq("id", runId);
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

export async function readRuns() {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("import_runs")
    .select("id, kind, mode, filename, status, rows_processed, rows_failed, message, created_at, finished_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

type AppRole = Database["public"]["Enums"]["app_role"];

export async function listUserAccounts() {
  const supabase = adminClient();
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (authError) throw new Error(authError.message);

  const { data: roleRows, error: roleError } = await supabase.from("user_roles").select("user_id, role");
  if (roleError) throw new Error(roleError.message);

  const rolesByUser = new Map<string, string[]>();
  for (const row of roleRows ?? []) {
    const list = rolesByUser.get(row.user_id) ?? [];
    list.push(String(row.role));
    rolesByUser.set(row.user_id, list);
  }

  const emails = (authData.users ?? []).map((u) => (u.email ?? "").toLowerCase()).filter(Boolean);
  const orderCounts = new Map<string, number>();
  if (emails.length > 0) {
    const { data: orders } = await supabase.from("orders").select("user_id, email");
    for (const order of orders ?? []) {
      const key = (order.email ?? "").toLowerCase();
      if (key) orderCounts.set(key, (orderCounts.get(key) ?? 0) + 1);
    }
  }

  return (authData.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? "",
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
    confirmed: Boolean(user.email_confirmed_at),
    roles: (rolesByUser.get(user.id) ?? []).sort(),
    orders: orderCounts.get((user.email ?? "").toLowerCase()) ?? 0,
  }));
}

export async function setUserRole(input: {
  actorId: string;
  userId: string;
  role: AppRole;
  grant: boolean;
}) {
  const supabase = adminClient();

  if (!input.grant && input.role === "admin") {
    if (input.actorId === input.userId) throw new Error("You cannot revoke your own admin access.");
    const { adminCount } = await readAdminContext(input.actorId);
    if (adminCount <= 1) throw new Error("At least one administrator must remain.");
  }

  if (input.grant) {
    const { error } = await supabase
      .from("user_roles")
      .upsert({ user_id: input.userId, role: input.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", input.userId)
      .eq("role", input.role);
    if (error) throw new Error(error.message);
  }

  return { ok: true as const };
}

export type UsageFilters = { from?: string | null; to?: string | null; company?: string | null };

export async function readUserUsage(filters: UsageFilters) {
  const supabase = adminClient();

  let query = supabase
    .from("orders")
    .select(
      "id, email, user_id, status, total_cents, created_at, order_items(company_name, company_number, product_name, fulfilment_status)",
    )
    .order("created_at", { ascending: false })
    .limit(2000);

  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59Z`);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const orders = data ?? [];
  const needle = (filters.company ?? "").trim().toLowerCase();

  const companyOptions = new Map<string, string>();
  for (const order of orders) {
    for (const item of order.order_items ?? []) {
      const label = item.company_name ?? item.company_number;
      if (label) companyOptions.set(label.toLowerCase(), label);
    }
  }

  const matching = needle
    ? orders.filter((order) =>
        (order.order_items ?? []).some((item) =>
          `${item.company_name ?? ""} ${item.company_number ?? ""}`.toLowerCase().includes(needle),
        ),
      )
    : orders;

  type Row = {
    email: string;
    userId: string | null;
    orders: number;
    paid: number;
    awaitingPayment: number;
    failedItems: number;
    deliveredItems: number;
    pendingItems: number;
    revenueCents: number;
    lastActivity: string | null;
    companies: string[];
  };

  const byUser = new Map<string, Row>();

  for (const order of matching) {
    const email = (order.email ?? "unknown").toLowerCase();
    const row =
      byUser.get(email) ??
      ({
        email,
        userId: order.user_id ?? null,
        orders: 0,
        paid: 0,
        awaitingPayment: 0,
        failedItems: 0,
        deliveredItems: 0,
        pendingItems: 0,
        revenueCents: 0,
        lastActivity: null,
        companies: [],
      } satisfies Row);

    row.userId = row.userId ?? order.user_id ?? null;
    row.orders += 1;
    if (order.status === "paid" || order.status === "completed") {
      row.paid += 1;
      row.revenueCents += order.total_cents ?? 0;
    }
    if (order.status === "awaiting_payment") row.awaitingPayment += 1;

    for (const item of order.order_items ?? []) {
      if (item.fulfilment_status === "failed") row.failedItems += 1;
      else if (item.fulfilment_status === "delivered") row.deliveredItems += 1;
      else row.pendingItems += 1;
      const label = item.company_name ?? item.company_number;
      if (label && !row.companies.includes(label)) row.companies.push(label);
    }

    if (!row.lastActivity || (order.created_at && order.created_at > row.lastActivity)) {
      row.lastActivity = order.created_at ?? row.lastActivity;
    }

    byUser.set(email, row);
  }

  const rows = [...byUser.values()].sort((a, b) => (b.lastActivity ?? "").localeCompare(a.lastActivity ?? ""));

  return {
    rows,
    companyOptions: [...companyOptions.values()].sort((a, b) => a.localeCompare(b)).slice(0, 200),
    totals: {
      users: rows.length,
      orders: rows.reduce((n, r) => n + r.orders, 0),
      paid: rows.reduce((n, r) => n + r.paid, 0),
      awaitingPayment: rows.reduce((n, r) => n + r.awaitingPayment, 0),
      failedItems: rows.reduce((n, r) => n + r.failedItems, 0),
      revenueCents: rows.reduce((n, r) => n + r.revenueCents, 0),
    },
  };
}
