// Canonical homepage head metadata. Single source of truth consumed by
// src/routes/index.tsx and guarded by src/lib/__tests__/home-head.test.ts
// so title, description and canonical URL cannot drift across builds.
import ogPreview from "@/assets/og-preview.mp4.asset.json";

const HOME_VIDEO_URL = `https://companieshousecyprus.com${ogPreview.url}`;

export const HOME_TITLE =
  "Companies House Cyprus — Free Search & Official Documents";

export const HOME_DESCRIPTION =
  "Free Cyprus company search & check on Companies House Cyprus by name or HE number, no account. Independent service: official certificates in 1–2 business days.";






export const HOME_CANONICAL_URL = "https://companieshousecyprus.com/";

type MetaTag =
  | { title: string }
  | { name: string; content: string }
  | { property: string; content: string };

export function buildHomeHead(): {
  meta: MetaTag[];
  links: { rel: string; href: string }[];
} {
  return {
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESCRIPTION },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: HOME_CANONICAL_URL },
      { property: "og:video", content: HOME_VIDEO_URL },
      { property: "og:video:secure_url", content: HOME_VIDEO_URL },
      { property: "og:video:type", content: "video/mp4" },
      { property: "og:video:width", content: "1200" },
      { property: "og:video:height", content: "630" },
      { property: "og:image", content: "https://companieshousecyprus.com/__l5e/assets-v1/7a5bd44f-0bc5-4a1c-a124-cfcd306f7b36/companies-house-cyprus-share.jpg" },
      { name: "twitter:image", content: "https://companieshousecyprus.com/__l5e/assets-v1/7a5bd44f-0bc5-4a1c-a124-cfcd306f7b36/companies-house-cyprus-share.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: HOME_CANONICAL_URL }],
  };
}
