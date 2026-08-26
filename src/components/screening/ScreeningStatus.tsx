import {
  ShieldCheck,
  Search,
  TriangleAlert,
  OctagonAlert,
  Info,
  CloudOff,
  Clock,
  UserCheck,
  CircleCheck,
  CircleMinus,
  type LucideIcon,
} from "lucide-react";
import {
  SCREENING_STATUS,
  SOURCE_STATUS,
  type ScreeningIconKey,
  type ScreeningStatusKey,
  type SourceStatusKey,
} from "@/lib/sanctions/status-system";
import { cn } from "@/lib/utils";

const ICONS: Record<ScreeningIconKey, LucideIcon> = {
  "shield-check": ShieldCheck,
  search: Search,
  "triangle-alert": TriangleAlert,
  "octagon-alert": OctagonAlert,
  info: Info,
  "cloud-off": CloudOff,
  clock: Clock,
  "user-check": UserCheck,
  "circle-check": CircleCheck,
  "circle-minus": CircleMinus,
};

export function ScreeningStatusIcon({ status, className }: { status: ScreeningStatusKey; className?: string | undefined }) {
  const Icon = ICONS[SCREENING_STATUS[status].icon];
  return <Icon aria-hidden className={cn("size-4 shrink-0", className)} />;
}

/**
 * Compact status badge. Colour is one of four signals — the label and icon are
 * always rendered, so the status survives greyscale printing.
 */
export function ScreeningStatusBadge({
  status,
  label,
  className,
}: {
  status: ScreeningStatusKey;
  label?: string | undefined;
  className?: string | undefined;
}) {
  const s = SCREENING_STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        s.bg,
        s.border,
        s.text,
        "print:border print:border-current",
        className,
      )}
    >
      <ScreeningStatusIcon status={status} className="size-3.5" />
      {label ?? s.label}
    </span>
  );
}

/**
 * Result banner: 4px status-coloured left border, pale status background and
 * dark text. Never fills the page with a warning colour.
 */
export function ScreeningStatusBanner({
  status,
  title,
  statement,
  children,
  className,
}: {
  status: ScreeningStatusKey;
  title?: string | undefined;
  statement?: string | undefined;
  children?: React.ReactNode;
  className?: string | undefined;
}) {
  const s = SCREENING_STATUS[status];
  return (
    <section
      className={cn("rounded-lg border p-4", s.bg, s.border, s.leftBorder, className)}
      aria-label={`Screening status: ${title ?? s.label}`}
    >
      <h2 className={cn("flex items-center gap-2 text-base font-semibold", s.text)}>
        <ScreeningStatusIcon status={status} />
        {title ?? s.label}
      </h2>
      {statement ?? s.explanation ? (
        <p className="mt-1 text-sm text-foreground">{statement ?? s.explanation}</p>
      ) : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}

/** Status badge for the "Official sources checked" table. Rows stay neutral. */
export function SourceStatusBadge({ source, className }: { source: SourceStatusKey; className?: string | undefined }) {
  const { label, status } = SOURCE_STATUS[source];
  return <ScreeningStatusBadge status={status} label={label} className={className} />;
}
