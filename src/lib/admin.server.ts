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
