/**
 * Follow-up email for baskets that were submitted but never paid.
 * Runs from the scheduler: any order still `awaiting_payment` 15 minutes after
 * it was created gets one friendly "can we help you finish this?" email.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const JOB_KEY = "order_reminders";
const DELAY_MINUTES = 15;
const BATCH_SIZE = 20;
const SITE_URL = "https://companieshousecyprus.com";

function client() {
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

export async function verifyReminderSecret(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const supabase = client();
  const { data } = await supabase.from("job_state").select("secret").eq("key", JOB_KEY).maybeSingle();
  const secret = (data as { secret?: string | null } | null)?.secret;
  return !!secret && secret.length === token.length && secret === token;
}

const euro = (cents: number | null | undefined) =>
  typeof cents === "number" ? `€${(cents / 100).toFixed(2)}` : undefined;

export async function sendPendingOrderReminders() {
  const supabase = client();
  const cutoff = new Date(Date.now() - DELAY_MINUTES * 60_000).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, reference, access_token, full_name, email, total_cents, created_at")
    .eq("status", "awaiting_payment")
    .is("reminder_sent_at", null)
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) return { ok: false as const, error: error.message };

  let sent = 0;
  for (const order of orders ?? []) {
    if (!order.email) continue;
    const { data: items } = await supabase
      .from("order_items")
      .select("product_name, company_name, company_number, total_cents")
      .eq("order_id", order.id);

    try {
      await sendTemplateEmail("order-assistance", order.email, {
        idempotencyKey: `order-assistance-${order.reference}`,
        sendOfficeCopy: true,
        templateData: {
          fullName: order.full_name ?? undefined,
          reference: order.reference,
          items: (items ?? []).map((item) => ({
            name: item.product_name,
            company:
              [item.company_name, item.company_number].filter(Boolean).join(" · ") || null,
            total: euro(item.total_cents),
          })),
          total: euro(order.total_cents),
          checkoutUrl: order.access_token
            ? `${SITE_URL}/order/${order.reference}?token=${order.access_token}`
            : `${SITE_URL}/cart`,
        },
      });
      sent += 1;
    } catch (err) {
      console.error("Order assistance email failed", order.reference, err);
    }

    await supabase
      .from("orders")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", order.id);
  }

  await supabase
    .from("job_state")
    .update({ last_run_at: new Date().toISOString() })
    .eq("key", JOB_KEY);

  return { ok: true as const, considered: orders?.length ?? 0, sent };
}
