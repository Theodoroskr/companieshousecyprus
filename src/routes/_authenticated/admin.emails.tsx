import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Mail, RefreshCw, Search } from "lucide-react";
import { listDeliveryLogs } from "@/lib/email-logs.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  head: () => ({
    meta: [
      { title: "Email delivery log — Admin" },
      {
        name: "description",
        content: "Which emails were sent, to whom, and whether they were delivered, rejected, bounced or blocked.",
      },
      { property: "og:title", content: "Email delivery log — Admin" },
      { property: "og:description", content: "Delivery events for every email the platform sends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminEmailsPage,
});

const EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "sent", label: "Sent" },
  { value: "rejected", label: "Rejected" },
  { value: "bounced", label: "Bounced" },
  { value: "complained", label: "Complaints" },
  { value: "unsubscribed", label: "Unsubscribed" },
  { value: "suppressed", label: "Suppressed" },
  { value: "rate_limited", label: "Rate limited" },
] as const;

const EVENT_STYLES: Record<string, { label: string; className: string }> = {
  sent: { label: "Sent", className: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-700 ring-red-500/20" },
  bounced: { label: "Bounced", className: "bg-red-500/10 text-red-700 ring-red-500/20" },
  complained: { label: "Complaint", className: "bg-orange-500/10 text-orange-700 ring-orange-500/20" },
  unsubscribed: { label: "Unsubscribed", className: "bg-slate-500/10 text-slate-700 ring-slate-500/20" },
  suppressed: { label: "Blocked", className: "bg-amber-500/10 text-amber-700 ring-amber-500/20" },
  rate_limited: { label: "Rate limited", className: "bg-sky-500/10 text-sky-700 ring-sky-500/20" },
};

function EventBadge({ type }: { type: string }) {
  const style = EVENT_STYLES[type] ?? {
    label: type.replace(/_/g, " "),
    className: "bg-muted text-muted-foreground ring-border",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset",
        style.className,
      )}
    >
      {style.label}
    </span>
  );
}

function stamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Nicosia",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function AdminEmailsPage() {
  const fetchLogs = useServerFn(listDeliveryLogs);
  const [recipient, setRecipient] = useState("");
  const [eventType, setEventType] = useState("");
  const [since, setSince] = useState("");
  const [applied, setApplied] = useState({ recipient: "", eventType: "", since: "" });

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-email-logs", applied],
    queryFn: () =>
      fetchLogs({
        data: {
          recipient: applied.recipient,
          eventType: applied.eventType,
          since: applied.since ? new Date(`${applied.since}T00:00:00Z`).toISOString() : "",
        },
      }),
  });

  const entries = data?.entries ?? [];
  const counts = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.eventType] = (acc[entry.eventType] ?? 0) + 1;
    return acc;
  }, {});

  const apply = () => setApplied({ recipient: recipient.trim(), eventType, since });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Mail className="size-5 text-copper" />
            Email delivery log
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every order confirmation, receipt and document notification the platform sends, with the delivery
            outcome reported by the mail service.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
          Refresh
        </Button>
      </header>

      <div className="mt-6 grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-muted-foreground">Recipient</span>
          <Input
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="client@example.com"
            onKeyDown={(event) => event.key === "Enter" && apply()}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-muted-foreground">Outcome</span>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {EVENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-muted-foreground">Since</span>
          <Input type="date" value={since} onChange={(event) => setSince(event.target.value)} />
        </label>
        <div className="flex items-end">
          <Button className="w-full" onClick={apply} disabled={isFetching}>
            <Search className="mr-2 size-4" />
            Apply filters
          </Button>
        </div>
      </div>

      {data?.error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{data.error}</span>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Object.entries(counts).map(([type, count]) => (
            <span key={type} className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-sm">
              <EventBadge type={type} />
              <span className="font-semibold">{count}</span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Sent at (Cyprus time)</th>
              <th className="px-4 py-3 font-semibold">Recipient</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Outcome</th>
              <th className="px-4 py-3 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {isFetching && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  <Loader2 className="mx-auto size-5 animate-spin" />
                </td>
              </tr>
            )}
            {!isFetching && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No email events found for these filters.
                </td>
              </tr>
            )}
            {entries.map((entry, index) => (
              <tr key={`${entry.messageId ?? entry.recipient}-${entry.timestamp}-${index}`} className="border-b last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{stamp(entry.timestamp)}</td>
                <td className="px-4 py-3 font-medium">{entry.recipient}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {entry.tags.length > 0 ? entry.tags.join(", ").replace(/-/g, " ") : "—"}
                </td>
                <td className="px-4 py-3">
                  <EventBadge type={entry.eventType} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{entry.status ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {data?.historyStartsAt
          ? `History available from ${stamp(data.historyStartsAt)}. `
          : ""}
        Delivery outcomes are reported by the mail service; opens are not tracked.
        {data?.hasMore ? " Showing the 100 most recent events — narrow the filters to see older activity." : ""}
      </p>
    </div>
  );
}
