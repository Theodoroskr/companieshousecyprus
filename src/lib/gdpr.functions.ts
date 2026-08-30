import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SuppressionStatus } from "@/lib/gdpr.server";

export const listSuppressionRequests = createServerFn({ method: "GET" })
  .inputValidator((data: { search?: string; status?: SuppressionStatus | "all" }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { listSuppressions } = await import("@/lib/gdpr.server");
    return listSuppressions(data);
  });

export const addSuppressionRequest = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      personName: string;
      companySlug?: string | null;
      requesterEmail?: string | null;
      reason?: string | null;
      internalNotes?: string | null;
    }) => data,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { createSuppression } = await import("@/lib/gdpr.server");
    return createSuppression({ ...data, userId: context.userId });
  });

export const updateSuppressionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: SuppressionStatus }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { setSuppressionStatus } = await import("@/lib/gdpr.server");
    return setSuppressionStatus(data.id, data.status);
  });

export const removeSuppressionRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { deleteSuppression } = await import("@/lib/gdpr.server");
    return deleteSuppression(data.id);
  });

export const lookupOfficialsForCompany = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { lookupCompanyOfficials } = await import("@/lib/gdpr.server");
    return lookupCompanyOfficials(data.slug);
  });
