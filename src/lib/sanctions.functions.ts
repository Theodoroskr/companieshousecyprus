import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSanctionsDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { readSanctionsDashboard } = await import("@/lib/sanctions.server");
    return readSanctionsDashboard();
  });

export const runSanctionsImportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { runSanctionsImport } = await import("@/lib/sanctions.server");
    return runSanctionsImport();
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
