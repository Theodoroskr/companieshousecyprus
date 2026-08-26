import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const subjectSchema = z.object({
  subjectType: z.enum(["individual", "entity", "vessel", "aircraft"]),
  name: z.string().min(2),
  previousNames: z.array(z.string()).optional(),
  aliases: z.array(z.string()).optional(),
  jurisdiction: z.string().nullish(),
  registrationNumber: z.string().nullish(),
  lei: z.string().nullish(),
  dateOfBirth: z.string().nullish(),
  nationality: z.string().nullish(),
  address: z.string().nullish(),
  identificationNumber: z.string().nullish(),
  country: z.string().nullish(),
  companyId: z.string().nullish(),
});

const sourcesSchema = z.array(z.enum(["EU_FSF", "UN_CONSOLIDATED", "UKSL", "OFAC_SDN"])).min(1);

export const runScreeningTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ subject: subjectSchema, sources: sourcesSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runScreening } = await import("@/lib/sanctions/screening.server");
    type ScreeningSubjectInput = Parameters<typeof runScreening>[1];
    const subject: ScreeningSubjectInput = {
      subjectType: data.subject.subjectType,
      name: data.subject.name,
      previousNames: data.subject.previousNames ?? [],
      aliases: data.subject.aliases ?? [],
      jurisdiction: data.subject.jurisdiction ?? null,
      registrationNumber: data.subject.registrationNumber ?? null,
      lei: data.subject.lei ?? null,
      dateOfBirth: data.subject.dateOfBirth ?? null,
      nationality: data.subject.nationality ?? null,
      address: data.subject.address ?? null,
      identificationNumber: data.subject.identificationNumber ?? null,
      country: data.subject.country ?? null,
      companyId: data.subject.companyId ?? null,
    };
    return runScreening(supabaseAdmin, subject, data.sources, "admin_test", context.userId);
  });

export const runCompanyScreening = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        slug: z.string().min(1),
        sources: sourcesSchema,
        previousNames: z.array(z.string().min(2)).optional(),
        corporateShareholders: z
          .array(
            z.object({
              name: z.string().min(2),
              registrationNumber: z.string().nullish(),
              jurisdiction: z.string().nullish(),
              legalEntityConfirmed: z.boolean(),
            }),
          )
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { screenCyprusCompany } = await import("@/lib/sanctions/screening.server");
    return screenCyprusCompany(supabaseAdmin, data.slug, data.sources, context.userId, {
      previousNames: data.previousNames ?? [],
      corporateShareholders: (data.corporateShareholders ?? []).map((s) => ({
        name: s.name,
        registrationNumber: s.registrationNumber ?? null,
        jurisdiction: s.jurisdiction ?? null,
        legalEntityConfirmed: s.legalEntityConfirmed,
      })),
    });
  });


export const fetchScreeningResult = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getScreeningResult } = await import("@/lib/sanctions/screening.server");
    return getScreeningResult(supabaseAdmin, data.requestId);
  });

export const submitAnalystDecision = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      candidateId: z.string().uuid(),
      decision: z.enum(["confirmed_match", "potential_match", "false_positive", "insufficient_information", "escalated"]),
      rationale: z.string().min(5, "A written rationale is required."),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { recordAnalystDecision } = await import("@/lib/sanctions/screening.server");
    return recordAnalystDecision(supabaseAdmin, data.candidateId, data.decision, data.rationale, context.userId);
  });

export const fetchScreeningConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("screening_rules_config").select("*").eq("key", "default").maybeSingle();
    return data;
  });

export const updateScreeningConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      weights: z.record(z.string(), z.number()),
      thresholds: z.record(z.string(), z.number()),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("screening_rules_config").select("rules_version").eq("key", "default").maybeSingle();
    const nextVersion = `rules-v${(Number(existing?.rules_version?.replace(/\D/g, "")) || 1) + 1}`;
    const { error } = await supabaseAdmin
      .from("screening_rules_config")
      .update({ weights: data.weights, thresholds: data.thresholds, rules_version: nextVersion, updated_by: context.userId, updated_at: new Date().toISOString() })
      .eq("key", "default");
    if (error) throw new Error(error.message);
    return { ok: true, rulesVersion: nextVersion };
  });

export const searchRegisterForScreening = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ q: z.string().min(2) }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const pattern = `%${data.q.replace(/[%_]/g, "")}%`;
    const { data: rows, error } = await supabaseAdmin
      .from("companies")
      .select("slug, name, reg_number, status_en, district_en")
      .ilike("name", pattern)
      .order("name")
      .limit(12);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
