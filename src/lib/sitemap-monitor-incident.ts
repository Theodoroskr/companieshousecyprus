export type SitemapAlertKind = "failure" | "recovery";

export type SitemapMonitorPreviousRun = {
  healthy: boolean;
  alert_signature: string | null;
};

export type SitemapMonitorIncidentAlert = {
  checked_at: string;
  alert_signature: string | null;
};

export type SitemapIncidentDecision = {
  kind: SitemapAlertKind | null;
  reason: string | null;
  incidentKey: string;
};

function incidentKeyFromAlert(alert: SitemapMonitorIncidentAlert, fallbackSignature: string) {
  return `${alert.checked_at}-${alert.alert_signature ?? fallbackSignature}`;
}

export function decideSitemapIncidentAlert(input: {
  healthy: boolean;
  signature: string;
  previousRun: SitemapMonitorPreviousRun | null;
  latestHealthyAt: string | null;
  openFailureAlert: SitemapMonitorIncidentAlert | null;
}): SitemapIncidentDecision {
  if (!input.healthy) {
    if (input.openFailureAlert) {
      return {
        kind: null,
        reason: "deduplicated: failure incident already reported",
        incidentKey: incidentKeyFromAlert(input.openFailureAlert, input.signature),
      };
    }

    return {
      kind: "failure",
      reason: null,
      incidentKey: `${input.latestHealthyAt ?? "initial"}-${input.signature}`,
    };
  }

  if (input.previousRun && input.previousRun.healthy === false) {
    if (input.openFailureAlert) {
      return {
        kind: "recovery",
        reason: null,
        incidentKey: incidentKeyFromAlert(input.openFailureAlert, input.previousRun.alert_signature ?? "failure"),
      };
    }

    return {
      kind: null,
      reason: "recovered: no prior failure alert was sent for this incident",
      incidentKey: input.signature,
    };
  }

  return { kind: null, reason: null, incidentKey: input.signature };
}