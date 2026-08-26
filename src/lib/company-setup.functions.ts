import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const enquirySchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(160),
  email: z.string().trim().email("Enter a valid business email address").max(255),
  telephone: z
    .string()
    .trim()
    .min(6)
    .max(40)
    .regex(/^\+?[0-9\s().-]{6,40}$/, "Enter a valid international telephone number"),
  country: z.string().trim().min(2, "Country of residence is required").max(80),
  nameOne: z.string().trim().max(160).optional(),
  nameTwo: z.string().trim().max(160).optional(),
  nameThree: z.string().trim().max(160).optional(),
  businessActivity: z.string().trim().min(3, "Describe the intended business activity").max(2000),
  shareholderCount: z.string().trim().max(40).optional(),
  directorCount: z.string().trim().max(40).optional(),
  corporateShareholders: z.string().trim().max(20).optional(),
  regulatedActivity: z.string().trim().max(20).optional(),
  regulatedActivityDetail: z.string().trim().max(1000).optional(),
  timeframe: z.string().trim().min(1, "Select a timeframe").max(40),
  services: z.array(z.string().trim().max(80)).max(20).optional(),
  additionalInformation: z.string().trim().max(4000).optional(),
  consentPrivacy: z.literal(true, { message: "Your privacy consent is required" }),
  consentSharing: z.literal(true, { message: "Your authorisation to share the enquiry is required" }),
  marketingOptIn: z.boolean().optional(),
  utmSource: z.string().trim().max(200).optional(),
  utmMedium: z.string().trim().max(200).optional(),
  utmCampaign: z.string().trim().max(200).optional(),
  landingPage: z.string().trim().max(500).optional(),
  referralUrl: z.string().trim().max(500).optional(),
  /** Honeypot — must stay empty. */
  website: z.string().max(200).optional(),
});

export const submitCompanySetupEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => enquirySchema.parse(input))
  .handler(async ({ data }) => {
    if (data.website) return { ok: true as const, id: "", emailed: false };

    const { storeGuideLead } = await import("./guides.server");
    const {
      COMPANY_SETUP_CONSENT_VERSION,
      COMPANY_SETUP_FORM_SOURCE,
      COMPANY_SETUP_LEAD_LABEL,
      CONSENT_TEXT_MARKETING,
      CONSENT_TEXT_PRIVACY,
      CONSENT_TEXT_SHARING,
      setupTimeframeLabel,
      yesNoLabel,
    } = await import("./company-setup");

    const notes = [
      `Proposed names: ${[data.nameOne, data.nameTwo, data.nameThree].filter(Boolean).join(" | ") || "Not provided"}`,
      `Directors: ${data.directorCount ?? "Not provided"}`,
      `Corporate/partnership/trust shareholders: ${yesNoLabel(data.corporateShareholders ?? "")}`,
      `Regulated activity: ${yesNoLabel(data.regulatedActivity ?? "")}${
        data.regulatedActivityDetail ? ` — ${data.regulatedActivityDetail}` : ""
      }`,
      `Timeframe: ${setupTimeframeLabel(data.timeframe)}`,
      data.additionalInformation ? `Additional information: ${data.additionalInformation}` : "",
      "",
      `Consent (privacy, accepted): ${CONSENT_TEXT_PRIVACY}`,
      `Consent (sharing, accepted): ${CONSENT_TEXT_SHARING}`,
      `Marketing opt-in: ${data.marketingOptIn ? `Yes — ${CONSENT_TEXT_MARKETING}` : "No"}`,
    ]
      .filter(Boolean)
      .join("\n");

    return storeGuideLead({
      leadType: "specialist_introduction",
      leadLabel: COMPANY_SETUP_LEAD_LABEL,
      formSource: COMPANY_SETUP_FORM_SOURCE,
      consentVersion: COMPANY_SETUP_CONSENT_VERSION,
      consentText: `${CONSENT_TEXT_PRIVACY} | ${CONSENT_TEXT_SHARING} | Marketing opt-in: ${
        data.marketingOptIn ? "yes" : "no"
      }`,
      fullName: data.fullName,
      email: data.email,
      telephone: data.telephone,
      country: data.country,
      businessActivity: data.businessActivity,
      ...(data.shareholderCount ? { shareholderCount: data.shareholderCount } : {}),
      corporateShareholders: undefined,
      ...(data.corporateShareholders
        ? { corporateShareholder: data.corporateShareholders === "yes" }
        : {}),
      timeframe: data.timeframe,
      servicesRequested: data.services ?? [],
      notes,
      ...(data.utmSource ? { utmSource: data.utmSource } : {}),
      ...(data.utmMedium ? { utmMedium: data.utmMedium } : {}),
      ...(data.utmCampaign ? { utmCampaign: data.utmCampaign } : {}),
      ...(data.landingPage ? { landingPage: data.landingPage } : {}),
      ...(data.referralUrl ? { referralUrl: data.referralUrl } : {}),
    });
  });
