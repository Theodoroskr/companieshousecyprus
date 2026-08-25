import { describe, expect, it } from "vitest";
import { decideSitemapIncidentAlert } from "./sitemap-monitor-incident";

describe("sitemap monitor incident alerting", () => {
  it("sends one failure email when an incident opens", () => {
    expect(
      decideSitemapIncidentAlert({
        healthy: false,
        signature: "/sitemap.xml:403",
        previousRun: null,
        latestHealthyAt: null,
        openFailureAlert: null,
      }),
    ).toEqual({
      kind: "failure",
      reason: null,
      incidentKey: "initial-/sitemap.xml:403",
    });
  });

  it("deduplicates subsequent failures in the same open incident even if the signature changes", () => {
    expect(
      decideSitemapIncidentAlert({
        healthy: false,
        signature: "/sitemap.xml:403|/sitemaps/pages.xml:500",
        previousRun: { healthy: false, alert_signature: "/sitemap.xml:403" },
        latestHealthyAt: "2026-08-25T12:00:00.000Z",
        openFailureAlert: {
          checked_at: "2026-08-25T12:15:00.000Z",
          alert_signature: "/sitemap.xml:403",
        },
      }),
    ).toEqual({
      kind: null,
      reason: "deduplicated: failure incident already reported",
      incidentKey: "2026-08-25T12:15:00.000Z-/sitemap.xml:403",
    });
  });

  it("sends one recovery email when an alerted incident clears", () => {
    expect(
      decideSitemapIncidentAlert({
        healthy: true,
        signature: "healthy",
        previousRun: { healthy: false, alert_signature: "/sitemap.xml:403" },
        latestHealthyAt: "2026-08-25T12:00:00.000Z",
        openFailureAlert: {
          checked_at: "2026-08-25T12:15:00.000Z",
          alert_signature: "/sitemap.xml:403",
        },
      }),
    ).toEqual({
      kind: "recovery",
      reason: null,
      incidentKey: "2026-08-25T12:15:00.000Z-/sitemap.xml:403",
    });
  });

  it("does not send recovery when no failure alert was sent", () => {
    expect(
      decideSitemapIncidentAlert({
        healthy: true,
        signature: "healthy",
        previousRun: { healthy: false, alert_signature: "/sitemap.xml:403" },
        latestHealthyAt: "2026-08-25T12:00:00.000Z",
        openFailureAlert: null,
      }),
    ).toMatchObject({
      kind: null,
      reason: "recovered: no prior failure alert was sent for this incident",
    });
  });
});