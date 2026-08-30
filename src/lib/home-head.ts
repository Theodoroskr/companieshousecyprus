// Canonical homepage head metadata. Single source of truth consumed by
// src/routes/index.tsx and guarded by src/lib/__tests__/home-head.test.ts
// so title, description and canonical URL cannot drift across builds.

export const HOME_TITLE = "Companies House Cyprus: Search 571,000+ Companies";

export const HOME_DESCRIPTION =
  "Companies House Cyprus search — free lookup of 571,000+ official Cyprus Registrar of Companies records: status, HE number, directors, registered office.";


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
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: HOME_CANONICAL_URL }],
  };
}
