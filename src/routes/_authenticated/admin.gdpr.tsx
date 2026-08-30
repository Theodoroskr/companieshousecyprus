import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Loader2, RotateCcw, Search, ShieldCheck, Trash2 } from "lucide-react";
import {
  addSuppressionRequest,
  listSuppressionRequests,
  lookupOfficialsForCompany,
  removeSuppressionRequest,
  updateSuppressionStatus,
} from "@/lib/gdpr.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/gdpr")({
  head: () => ({
    meta: [
      { title: "GDPR removals — Admin" },
      {
        name: "description",
        content: "Manage GDPR name-suppression requests for officials shown on Companies House Cyprus profiles.",
      },
      { property: "og:title", content: "GDPR removals — Admin" },
      { property: "og:description", content: "Manage GDPR name-suppression requests for company officials." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminGdprPage,
});

type StatusFilter = "active" | "lifted" | "all";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "lifted", label: "Lifted" },
  { key: "all", label: "All" },
];

function AdminGdprPage() {
  const list = useServerFn(listSuppressionRequests);
  const add = useServerFn(addSuppressionRequest);
  const setStatus = useServerFn(updateSuppressionStatus);
  const remove = useServerFn(removeSuppressionRequest);
  const lookup = useServerFn(lookupOfficialsForCompany);
  const queryClient = useQueryClient();

  const [status, setStatusFilter] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [personName, setPersonName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [lookupResult, setLookupResult] = useState<{ companyName: string | null; officials: string[] } | null>(null);

  const query = useQuery({
    queryKey: ["admin", "gdpr", status, search],
    queryFn: () => list({ data: { status, search } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "gdpr"] });

  const addMutation = useMutation({
    mutationFn: () =>
      add({
        data: {
          personName,
          companySlug: companySlug || null,
          requesterEmail: requesterEmail || null,
          reason: reason || null,
          internalNotes: internalNotes || null,
        },
      }),
    onSuccess: (res) => {
      setError(null);
      setMessage(`Suppression added. ${res.requeued} company page(s) queued for re-crawl.`);
      setPersonName("");
      setCompanySlug("");
      setRequesterEmail("");
      setReason("");
      setInternalNotes("");
      setLookupResult(null);
      void invalidate();
    },
    onError: (err) => {
      setMessage(null);
      setError(err instanceof Error ? err.message : "Could not add the suppression");
    },
  });

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: "active" | "lifted" }) => setStatus({ data: input }),
    onSuccess: (_r, input) => {
      setError(null);
      setMessage(input.status === "active" ? "Suppression re-applied." : "Suppression lifted — the name is public again.");
      void invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not update the suppression"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      setError(null);
      setMessage("Suppression record deleted.");
      void invalidate();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Could not delete the record"),
  });

  const lookupMutation = useMutation({
    mutationFn: (slug: string) => lookup({ data: { slug } }),
    onSuccess: (res) => setLookupResult({ companyName: res.companyName, officials: res.officials }),
    onError: () => setLookupResult(null),
  });

  const rows = query.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="flex items-start gap-3">
        <ShieldCheck className="mt-1 size-6 text-copper" />
        <div>
          <h1 className="font-display text-2xl font-bold">GDPR name removals</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Suppressed names are withheld everywhere on the public site — company profiles, shared-officer links and
            structured data. The underlying registry record is untouched; only the published name is hidden.
          </p>
        </div>
      </header>

      {message ? (
        <p className="mt-6 rounded-md border border-copper/30 bg-copper/5 px-4 py-3 text-sm">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <section className="mt-8 rounded-xl border bg-card p-6">
        <h2 className="font-display text-lg font-semibold">New suppression request</h2>
        <form
          className="mt-4 grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!personName.trim()) return;
            addMutation.mutate();
          }}
        >
          <label className="text-sm">
            <span className="font-medium">Name as published *</span>
            <input
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              required
              placeholder="ΓΕΩΡΓΙΟΣ ΠΑΠΑΔΟΠΟΥΛΟΣ"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">Company (optional — blank = site-wide)</span>
            <div className="mt-1 flex gap-2">
              <input
                value={companySlug}
                onChange={(e) => setCompanySlug(e.target.value)}
                placeholder="C266206 or HE266206"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!companySlug.trim() || lookupMutation.isPending}
                onClick={() => lookupMutation.mutate(companySlug)}
              >
                {lookupMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </Button>
            </div>
          </label>

          <label className="text-sm">
            <span className="font-medium">Requester email</span>
            <input
              type="email"
              value={requesterEmail}
              onChange={(e) => setRequesterEmail(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="font-medium">Reason given</span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Art. 17 erasure request"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="font-medium">Internal notes</span>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </label>

          {lookupResult ? (
            <div className="md:col-span-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{lookupResult.companyName ?? "Company not found"}</p>
              {lookupResult.officials.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {lookupResult.officials.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setPersonName(name)}
                      className="rounded-full border px-3 py-1 text-xs hover:bg-background"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-muted-foreground">No officials recorded for this company.</p>
              )}
            </div>
          ) : null}

          <div className="md:col-span-2">
            <Button type="submit" disabled={addMutation.isPending || !personName.trim()}>
              {addMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <EyeOff className="mr-2 size-4" />}
              Suppress this name
            </Button>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={
                  status === f.key
                    ? "rounded-md bg-background px-3 py-1.5 text-sm font-semibold text-copper shadow-sm"
                    : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                }
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company or requester"
            className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
          />
          {query.isFetching ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Requester</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    {query.isLoading ? "Loading…" : "No suppression requests recorded."}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium">
                      {row.person_name}
                      {row.reason ? <div className="text-xs text-muted-foreground">{row.reason}</div> : null}
                    </td>
                    <td className="px-4 py-3">{row.company_slug ?? "Site-wide"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.requester_email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.status === "active"
                            ? "rounded-full bg-copper/10 px-2.5 py-1 text-xs font-semibold text-copper"
                            : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                        }
                      >
                        {row.status === "active" ? "Suppressed" : "Lifted"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              id: row.id,
                              status: row.status === "active" ? "lifted" : "active",
                            })
                          }
                        >
                          {row.status === "active" ? (
                            <>
                              <RotateCcw className="mr-1.5 size-3.5" /> Lift
                            </>
                          ) : (
                            <>
                              <EyeOff className="mr-1.5 size-3.5" /> Re-apply
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm("Delete this suppression record permanently?")) deleteMutation.mutate(row.id);
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
