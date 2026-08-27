/**
 * Directory signal definitions.
 *
 * Each signal groups one or more Registrar `status_en` values into a
 * browsable, SEO-indexable section. Shared by the directory index page,
 * the signal detail pages and the page sitemap.
 */

export type DirectorySignal = {
  slug: string;
  title: string;
  /** Short description shown on the index card. */
  summary: string;
  /** Longer explanation shown on the detail page. */
  detail: string;
  /** Registrar status values that belong to this signal. */
  statuses: string[];
  /** Grouping used on the index page. */
  group: "insolvency" | "strike_off" | "lifecycle";
};

export const DIRECTORY_SIGNALS: DirectorySignal[] = [
  {
    slug: "court-ordered-liquidation",
    title: "Companies in Court-Ordered Liquidation",
    summary:
      "Companies placed into compulsory liquidation by court order, as recorded by the Department of Registrar of Companies.",
    detail:
      "These companies have been placed into liquidation by a court order. A liquidator realises the assets and distributes proceeds to creditors; the company is normally dissolved once the liquidation completes.",
    statuses: [
      "Liquidation by court order",
      "Liquidation by court order, special administrator appointed",
    ],
    group: "insolvency",
  },
  {
    slug: "members-voluntary-liquidation",
    title: "Companies in Members' Voluntary Liquidation",
    summary:
      "Solvent companies wound up by decision of their members rather than by a court or creditors.",
    detail:
      "A members' voluntary liquidation is started by the shareholders of a solvent company. It is an orderly wind-down rather than an insolvency event, although the company will cease to exist at the end of the process.",
    statuses: ["Members' voluntary liquidation"],
    group: "insolvency",
  },
  {
    slug: "creditors-voluntary-liquidation",
    title: "Companies in Creditors' Voluntary Liquidation",
    summary:
      "Companies wound up voluntarily where creditors control the liquidation because the company cannot pay its debts.",
    detail:
      "A creditors' voluntary liquidation follows a resolution to wind up a company that is unable to pay its debts in full. Creditors have a say in the appointment and conduct of the liquidator.",
    statuses: ["Creditors' voluntary liquidation"],
    group: "insolvency",
  },
  {
    slug: "administration",
    title: "Companies in Administration",
    summary:
      "Companies placed under an administrator's control to rescue the business or realise assets.",
    detail:
      "Administration puts a company under the control of an appointed administrator. The aim is to rescue the business as a going concern or, failing that, to achieve a better result for creditors than an immediate liquidation.",
    statuses: ["Under administration", "Under administration and liquidation"],
    group: "insolvency",
  },
  {
    slug: "provisional-liquidator-appointed",
    title: "Provisional Liquidator Appointed",
    summary:
      "Companies where the court has appointed a provisional liquidator ahead of a full winding-up order.",
    detail:
      "A provisional liquidator is appointed to protect a company's assets before the court decides on a winding-up petition. It is an early-stage insolvency signal that usually precedes liquidation.",
    statuses: ["Provisional liquidator appointed", "Under liquidation"],
    group: "insolvency",
  },
  {
    slug: "strike-off-notice-published",
    title: "Companies Facing Strike-Off",
    summary:
      "Companies with a published three-month strike-off notice — they will be removed from the register unless action is taken.",
    detail:
      "The Registrar publishes a three-month notice before striking a company off the register, typically for failure to file annual returns. Unless the company responds, it will be struck off and cease to exist.",
    statuses: ["Three-month strike-off notice published"],
    group: "strike_off",
  },
  {
    slug: "at-risk-of-strike-off",
    title: "Companies at Risk of Strike-Off",
    summary:
      "Companies that have received a reminder letter from the Registrar — an early compliance-failure signal.",
    detail:
      "A reminder letter is sent when a company appears to be in default of its filing obligations. It is the first formal step on the path to a strike-off notice and is a useful early-warning signal in due diligence.",
    statuses: ["Reminder letter sent"],
    group: "strike_off",
  },
  {
    slug: "struck-off",
    title: "Struck-Off Companies",
    summary:
      "Companies removed from the register by the Registrar, most often for failing to file.",
    detail:
      "A struck-off company has been removed from the register and no longer legally exists, although historical registry data remains available for reference and can be relevant to background checks.",
    statuses: ["Struck off"],
    group: "strike_off",
  },
  {
    slug: "dissolved",
    title: "Dissolved Companies",
    summary:
      "Companies dissolved on completion of a liquidation, following a merger, or by court decision.",
    detail:
      "These companies have completed a formal process — liquidation, merger, or a court decision — and have been dissolved. They are retained here as part of the historical registry record.",
    statuses: [
      "Dissolved on completion of voluntary liquidation",
      "Dissolved on completion of liquidation",
      "Dissolved following merger",
      "Removed from the register by Supreme Court decision",
    ],
    group: "lifecycle",
  },
  {
    slug: "active",
    title: "Active Companies",
    summary: "Companies currently registered and in good standing on the register.",
    detail:
      "Registered companies with no strike-off, liquidation or administration event recorded against them in our copy of the register.",
    statuses: ["Registered", "European Company (SE)"],
    group: "lifecycle",
  },
];

export const DIRECTORY_GROUP_LABELS: Record<DirectorySignal["group"], string> = {
  insolvency: "Insolvency & liquidation",
  strike_off: "Strike-off & compliance",
  lifecycle: "Registry lifecycle",
};

export const DIRECTORY_PAGE_SIZE = 100;
/** Deep pagination is capped so offset scans stay inside the statement timeout. */
export const DIRECTORY_MAX_PAGE = 200;

export function getDirectorySignal(slug: string): DirectorySignal | undefined {
  return DIRECTORY_SIGNALS.find((signal) => signal.slug === slug);
}
