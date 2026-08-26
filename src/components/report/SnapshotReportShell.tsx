import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared page shell for every Sanctions Risk Snapshot surface (client portal and
 * analyst review) so the report layout, spacing and loading/error states are identical.
 */
export function SnapshotReportShell({
  backTo,
  backLabel,
  actions,
  subtitle,
  statusSlot,
  isLoading,
  loadingLabel = "Loading screening…",
  error,
  empty,
  children,
}: {
  backTo: "/account/orders" | "/admin/orders";
  backLabel: string;
  actions?: ReactNode;
  subtitle?: ReactNode;
  statusSlot?: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  error?: string | null;
  empty?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to={backTo}>
            <ArrowLeft className="size-4" /> {backLabel}
          </Link>
        </Button>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 rounded-xl border bg-card p-8 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> {loadingLabel}
        </p>
      ) : error ? (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">
          {error}
        </p>
      ) : children ? (
        <div className="space-y-4">
          {subtitle || statusSlot ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : <span />}
              {statusSlot}
            </div>
          ) : null}
          {children}
        </div>
      ) : (
        empty ?? null
      )}
    </div>
  );
}
