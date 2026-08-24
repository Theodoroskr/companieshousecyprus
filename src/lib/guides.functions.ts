import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const campaignSchema = z.object({
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  landingPage: z.string().trim().max(500).optional(),
  referralUrl: z.string().trim().max(500).optional(),
  /** Honeypot — must stay empty. */
  website: z.string().max(200).optional(),
});

const downloadSchema = campaignSchema.extend({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid business email address").max(255),
  telephone: z.string().trim().max(40).optional(),
  country: z.string().trim().min(2, "Country of residence is required").max(80),
  businessActivity: z.string().trim().min(3, "Describe the proposed business activity").max(1000),
  timeframe: z.string().trim().min(1, "Select an expected timeframe").max(40),
  consent: z.literal(true, { message: "Your consent is required to send the guide" }),
});

const introductionSchema = campaignSchema.extend({
  fullName: z.string().trim().min(2, "Full name is required").max(160),
  email: z.string().trim().email("Enter a valid business email address").max(255),
  telephone: z.string().trim().max(40).optional(),
  country: z.string().trim().min(2, "Country of residence is required").max(80),
  nationality: z.string().trim().max(80).optional(),
  businessActivity: z.string().trim().min(3, "Describe the proposed business activity").max(1000),
  countriesOfOperation: z.string().trim().max(300).optional(),
  shareholderCount: z.string().trim().max(40).optional(),
  corporateShareholder: z.boolean().optional(),
  timeframe: z.string().trim().min(1, "Select a registration timeframe").max(40),
  services: z.array(z.string().trim().max(60)).max(12).optional(),
  additionalInformation: z.string().trim().max(4000).optional(),
  consent: z.literal(true, { message: "Your consent is required to review the enquiry" }),
});

export const getGuideContent = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { loadGuideContent } = await import("./guides.server");
    return loadGuideContent(data.slug);
  });

export const submitGuideDownload = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => downloadSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const, id: "", emailed: false };
    const { storeGuideLead } = await import("./guides.server");
    return storeGuideLead({
      leadType: "guide_download",
      formSource: "guides/register-company-cyprus#download",
      fullName: `${data.firstName} ${data.lastName}`.trim(),
      email: data.email,
      ...(data.telephone ? { telephone: data.telephone } : {}),
      country: data.country,
      businessActivity: data.businessActivity,
      timeframe: data.timeframe,
      ...(data.utmSource ? { utmSource: data.utmSource } : {}),
      ...(data.utmMedium ? { utmMedium: data.utmMedium } : {}),
      ...(data.utmCampaign ? { utmCampaign: data.utmCampaign } : {}),
      ...(data.landingPage ? { landingPage: data.landingPage } : {}),
      ...(data.referralUrl ? { referralUrl: data.referralUrl } : {}),
    });
  });

export const submitSpecialistIntroduction = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => introductionSchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const, id: "", emailed: false };
    const { storeGuideLead } = await import("./guides.server");
    return storeGuideLead({
      leadType: "specialist_introduction",
      formSource: "guides/register-company-cyprus#introduction",
      fullName: data.fullName,
      email: data.email,
      ...(data.telephone ? { telephone: data.telephone } : {}),
      country: data.country,
      ...(data.nationality ? { nationality: data.nationality } : {}),
      businessActivity: data.businessActivity,
      ...(data.countriesOfOperation ? { countriesOfOperation: data.countriesOfOperation } : {}),
      ...(data.shareholderCount ? { shareholderCount: data.shareholderCount } : {}),
      ...(data.corporateShareholder !== undefined
        ? { corporateShareholder: data.corporateShareholder }
        : {}),
      timeframe: data.timeframe,
      ...(data.services ? { servicesRequested: data.services } : {}),
      ...(data.additionalInformation ? { notes: data.additionalInformation } : {}),
      ...(data.utmSource ? { utmSource: data.utmSource } : {}),
      ...(data.utmMedium ? { utmMedium: data.utmMedium } : {}),
      ...(data.utmCampaign ? { utmCampaign: data.utmCampaign } : {}),
      ...(data.landingPage ? { landingPage: data.landingPage } : {}),
      ...(data.referralUrl ? { referralUrl: data.referralUrl } : {}),
    });
  });
