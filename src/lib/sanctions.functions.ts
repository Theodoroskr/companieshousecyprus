import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSanctionsDashboard = createServerFn({ method: "GET" })
  .inputValidator((data: { sourceCode?: string } | undefined) => data ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { readSanctionsDashboard } = await import("@/lib/sanctions.server");
    return readSanctionsDashboard(data.sourceCode);
  });

export const listSanctionsSourcesFn = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { listSanctionsSources } = await import("@/lib/sanctions.server");
    return listSanctionsSources();
  });

export const runSanctionsImportNow = createServerFn({ method: "POST" })
  .inputValidator((data: { sourceCode?: string; force?: boolean } | undefined) => data ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { runSanctionsImport } = await import("@/lib/sanctions.server");
    // Manual admin runs may force an inactive source (initial connection test
    // + first import before a source is activated for scheduling).
    return runSanctionsImport({ ...(data.sourceCode ? { sourceCode: data.sourceCode } : {}), force: true });
  });

export const testSanctionsConnectionNow = createServerFn({ method: "POST" })
  .inputValidator((data: { sourceCode: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { testSanctionsConnection } = await import("@/lib/sanctions.server");
    return testSanctionsConnection(data.sourceCode);
  });

export const setSanctionsSourceActiveFn = createServerFn({ method: "POST" })
  .inputValidator((data: { sourceCode: string; active: boolean }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { setSanctionsSourceActive } = await import("@/lib/sanctions.server");
    return setSanctionsSourceActive(data.sourceCode, data.active);
  });

export const getSanctionsEntryRaw = createServerFn({ method: "POST" })
  .inputValidator((data: { sourceCode: string; sourceRecordId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { readSanctionsEntryRaw } = await import("@/lib/sanctions.server");
    return readSanctionsEntryRaw(data.sourceCode, data.sourceRecordId);
  });

export const getSanctionsChanges = createServerFn({ method: "POST" })
  .inputValidator((data: { importId: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { readSanctionsChanges } = await import("@/lib/sanctions.server");
    return readSanctionsChanges(data.importId);
  });

export const getSanctionsRawFileUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { storagePath: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { createRawFileDownloadUrl } = await import("@/lib/sanctions.server");
    return createRawFileDownloadUrl(data.storagePath);
  });
