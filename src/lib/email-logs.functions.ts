import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EmailLogResult } from "@/lib/email-logs.server";

export type EmailLogFilters = {
  recipient?: string;
  eventType?: string;
  since?: string;
  cursor?: string;
};

/** Admin-only: sends a sample order confirmation to the given address to verify delivery + copies. */
export const sendTestOrderConfirmation = createServerFn({ method: "POST" })
  .inputValidator((data: { to: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { sendOrderConfirmationEmail } = await import("@/lib/order-emails.server");
    await sendOrderConfirmationEmail(
      {
        reference: `TEST-${Date.now()}`,
        full_name: "Test Customer",
        email: data.to,
        subtotal_cents: 2900,
        service_fee_cents: 0,
        vat_cents: 551,
        total_cents: 3451,
      },
      [
        {
          product_name: "Cyprus Company Profile (Structure) Report",
          company_name: "TEST COMPANY LIMITED",
          company_number: "HE123456",
          quantity: 1,
          total_cents: 2900,
        },
      ],
    );
    return { sent: true, to: data.to };
  });

export const listDeliveryLogs = createServerFn({ method: "POST" })
  .inputValidator((data: EmailLogFilters | undefined) => data ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<EmailLogResult> => {
    const { assertSupport } = await import("@/lib/admin.server");
    await assertSupport(context.userId);
    const { readEmailLogs } = await import("@/lib/email-logs.server");
    return readEmailLogs({
      recipient: data.recipient?.trim() || undefined,
      eventType: data.eventType?.trim() || undefined,
      since: data.since?.trim() || undefined,
      cursor: data.cursor?.trim() || undefined,
      limit: 100,
    });
  });
