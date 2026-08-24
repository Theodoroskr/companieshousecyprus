import type { Database } from "@/integrations/supabase/types";
import {
  CONSENT_TEXT_DOWNLOAD,
  CONSENT_TEXT_INTRODUCTION,
  CONSENT_VERSION_DOWNLOAD,
  CONSENT_VERSION_INTRODUCTION,
  GUIDE_SLUG,
  TIMEFRAME_OPTIONS,
  type GuideEditorial,
  type GuideFee,
} from "./guides";
import { sendTemplateEmail } from "./email-templates/send-email";

type LeadInsert = Database["public"]["Tables"]["guide_leads"]["Insert"];

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadGuideContent(slug: string = GUIDE_SLUG): Promise<{
  editorial: GuideEditorial | null;
  fees: GuideFee[];
}> {
  const db = await admin();
  const [editorialRes, feesRes] = await Promise.all([
    db.from("guide_editorial").select("*").eq("guide_slug", slug).maybeSingle(),
    db
      .from("guide_fees")
      .select("label, amount, note, source_url, last_verified, needs_verification")
      .eq("guide_slug", slug)
      .order("sort_order", { ascending: true }),
  ]);

  const row = editorialRes.data;
  const editorial: GuideEditorial | null = row
    ? {
        ...row,
        official_source_links: Array.isArray(row.official_source_links)
          ? (row.official_source_links as GuideEditorial["official_source_links"])
          : [],
      }
    : null;

  return { editorial, fees: (feesRes.data ?? []) as GuideFee[] };
}

/** Simple DB-backed rate limit: max 3 submissions per email per 10 minutes. */
async function assertNotRateLimited(email: string) {
  const db = await admin();
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db
    .from("guide_leads")
    .select("id", { count: "exact", head: true })
    .ilike("email", email)
    .gte("created_at", since);
  if ((count ?? 0) >= 3) {
    throw new Error("Too many submissions from this email address. Please try again in a few minutes.");
  }
}

function timeframeLabel(value: string) {
  return TIMEFRAME_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export interface StoreLeadInput {
  leadType: "guide_download" | "specialist_introduction";
  formSource: string;
  fullName: string;
  email: string;
  telephone?: string;
  country: string;
  nationality?: string;
  businessActivity: string;
  countriesOfOperation?: string;
  shareholderCount?: string;
  corporateShareholder?: boolean;
  timeframe: string;
  servicesRequested?: string[];
  notes?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  referralUrl?: string;
}

export async function storeGuideLead(input: StoreLeadInput) {
  await assertNotRateLimited(input.email);

  const isDownload = input.leadType === "guide_download";
  const consentVersion = isDownload ? CONSENT_VERSION_DOWNLOAD : CONSENT_VERSION_INTRODUCTION;

  const row: LeadInsert = {
    lead_type: input.leadType,
    form_source: input.formSource,
    full_name: input.fullName,
    email: input.email,
    telephone: input.telephone ?? null,
    country: input.country,
    nationality: input.nationality ?? null,
    business_activity: input.businessActivity,
    countries_of_operation: input.countriesOfOperation ?? null,
    shareholder_count: input.shareholderCount ?? null,
    corporate_shareholder: input.corporateShareholder ?? null,
    timeframe: input.timeframe,
    services_requested: input.servicesRequested ?? [],
    consent_text_version: consentVersion,
    consent_at: new Date().toISOString(),
    utm_source: input.utmSource ?? null,
    utm_medium: input.utmMedium ?? null,
    utm_campaign: input.utmCampaign ?? null,
    landing_page: input.landingPage ?? null,
    referral_url: input.referralUrl ?? null,
    notes: input.notes ?? null,
    lead_status: "new",
  };

  const db = await admin();
  const { data, error } = await db.from("guide_leads").insert(row).select("id").single();
  if (error) throw new Error(error.message);

  const consentText = isDownload ? CONSENT_TEXT_DOWNLOAD : CONSENT_TEXT_INTRODUCTION;
  const receivedAt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Nicosia",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const notifyData = {
    leadType: isDownload ? "Guide download" : "Specialist introduction request",
    fullName: input.fullName,
    email: input.email,
    telephone: input.telephone ?? "",
    country: input.country,
    nationality: input.nationality ?? "",
    businessActivity: input.businessActivity,
    countriesOfOperation: input.countriesOfOperation ?? "",
    shareholderCount: input.shareholderCount ?? "",
    corporateShareholder:
      input.corporateShareholder === undefined ? "" : input.corporateShareholder ? "Yes" : "No",
    timeframe: timeframeLabel(input.timeframe),
    services: (input.servicesRequested ?? []).join(", "),
    notes: input.notes ?? "",
    formSource: input.formSource,
    landingPage: input.landingPage ?? "",
    utm: [input.utmSource, input.utmMedium, input.utmCampaign].filter(Boolean).join(" / "),
    consentText,
    consentVersion,
    receivedAt: `${receivedAt} (Asia/Nicosia)`,
  };

  // Delivery must never block the lead being stored.
  const results = await Promise.allSettled([
    sendTemplateEmail("guide-lead-internal", "info@companieshousecyprus.com", {
      replyTo: input.email,
      templateData: notifyData,
      idempotencyKey: `lead-internal-${data.id}`,
    }),
    sendTemplateEmail("guide-lead-confirmation", input.email, {
      templateData: {
        firstName: input.fullName.split(" ")[0] ?? input.fullName,
        isDownload,
        guideUrl: "https://companieshousecyprus.com/guides/register-company-cyprus",
        consentText,
      },
      idempotencyKey: `lead-confirm-${data.id}`,
    }),
  ]);

  const emailed = results.every((result) => result.status === "fulfilled");

  return { ok: true as const, id: data.id, emailed };
}
