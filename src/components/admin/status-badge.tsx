const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  processing: "Processing",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  awaiting_payment:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
  paid:
    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50",
  processing:
    "bg-copper/10 text-copper border-copper/20 dark:bg-copper/15 dark:text-copper dark:border-copper/30",
  delivered:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50",
  cancelled:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-400 dark:border-slate-800",
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status.replace(/_/g, " ");
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.cancelled;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles}`}
    >
      {label}
    </span>
  );
}
