import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type A4AReportKind = "structure" | "credit";

export const checkApi4allConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { getAccessToken } = await import("@/lib/api4all.server");
    try {
      const token = await getAccessToken(true);
      return { ok: true as const, tokenLength: token.length };
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : "Unknown error" };
    }
  });

export const searchApi4all = createServerFn({ method: "POST" })
  .inputValidator((data: { query: string; by: "reg_no" | "name" }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { searchByName, searchByRegistration } = await import("@/lib/api4all.server");
    const query = data.query.trim();
    if (!query) return { hits: [] };
    const hits = data.by === "name" ? await searchByName(query) : await searchByRegistration(query);
    return { hits };
  });

export const getApi4allReport = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: A4AReportKind; code: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { fetchReport } = await import("@/lib/api4all.server");
    const report = await fetchReport(data.kind, data.code.trim());
    return { kind: data.kind, code: data.code.trim(), report };
  });

export const orderApi4allReport = createServerFn({ method: "POST" })
  .inputValidator((data: { kind: A4AReportKind; code: string; reference: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { createOrder } = await import("@/lib/api4all.server");
    const result = await createOrder({
      kind: data.kind,
      code: data.code.trim(),
      reference: data.reference.trim() || `CHC-${Date.now()}`,
    });
    return { result };
  });
