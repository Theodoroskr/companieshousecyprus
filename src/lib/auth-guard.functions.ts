import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AuthChallengeMode = "signin" | "signup" | "forgot";

export const verifyAuthChallenge = createServerFn({ method: "POST" })
  .inputValidator((data: { mode: AuthChallengeMode; token: string | null }) => data)
  .handler(async ({ data }) => {
    const { verifyAuthAttempt } = await import("@/lib/auth-guard.server");
    return verifyAuthAttempt(data.mode, data.token);
  });

export const getAuthTrafficBreakdown = createServerFn({ method: "GET" })
  .inputValidator((data: { days: number }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { readAuthTrafficBreakdown } = await import("@/lib/auth-guard.server");
    return readAuthTrafficBreakdown(data.days);
  });
