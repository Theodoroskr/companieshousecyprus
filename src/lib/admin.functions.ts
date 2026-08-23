import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CompanyImportRow, OfficialImportRow } from "@/lib/registrar-mapping";

export type ImportKind = "companies" | "officials";

export const getAdminContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isAdmin, adminCount } = await import("@/lib/admin.server").then((m) =>
      m.readAdminContext(context.userId),
    );
    return { userId: context.userId, isAdmin, adminCount };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { claimFirstAdminForUser } = await import("@/lib/admin.server");
    return claimFirstAdminForUser(context.userId);
  });

export const getImportStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, readStats } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return readStats();
  });

export const startImportRun = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: ImportKind; mode: string; filename: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin, createRun } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return createRun({ ...data, userId: context.userId });
  });

export const importCompanyBatch = createServerFn({ method: "POST" })
  .inputValidator((data: { runId: string; rows: CompanyImportRow[] }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin, upsertCompanies } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return upsertCompanies(data.runId, data.rows);
  });

export const importOfficialsBatch = createServerFn({ method: "POST" })
  .inputValidator((data: { runId: string; rows: OfficialImportRow[] }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin, insertOfficials } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return insertOfficials(data.runId, data.rows);
  });

export const clearOfficials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, truncateOfficials } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return truncateOfficials();
  });

export const refreshOfficialsCount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, runRefreshOfficialsCount } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return runRefreshOfficialsCount();
  });

export const finishImportRun = createServerFn({ method: "POST" })
  .inputValidator((data: { runId: string; status: "completed" | "failed"; message?: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin, closeRun } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return closeRun(data.runId, data.status, data.message ?? null);
  });

export const listImportRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin, readRuns } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    return readRuns();
  });
