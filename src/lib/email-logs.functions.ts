import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EmailLogResult } from "@/lib/email-logs.server";

export type EmailLogFilters = {
  recipient?: string;
  eventType?: string;
  since?: string;
  cursor?: string;
};

export const listDeliveryLogs = createServerFn({ method: "POST" })
  .inputValidator((data: EmailLogFilters | undefined) => data ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<EmailLogResult> => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.userId);
    const { readEmailLogs } = await import("@/lib/email-logs.server");
    return readEmailLogs({
      recipient: data.recipient?.trim() || undefined,
      eventType: data.eventType?.trim() || undefined,
      since: data.since?.trim() || undefined,
      cursor: data.cursor?.trim() || undefined,
      limit: 100,
    });
  });
