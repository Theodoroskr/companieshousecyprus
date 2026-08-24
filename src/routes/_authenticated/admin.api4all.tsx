import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkApi4allConnection,
  getApi4allReport,
  orderApi4allReport,
  searchApi4all,
  type A4AReportKind,
} from "@/lib/api4all.functions";
import { getA4aJobStatus, resumeA4aJob, runA4aPollNow } from "@/lib/a4a-jobs.functions";

export const Route = createFileRoute("/_authenticated/admin/api4all")({
  head: () => ({
    meta: [
      { title: "API4ALL integration | Companies House Cyprus" },
      { name: "description", content: "Connect to API4ALL and fetch structure and credit reports." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Api4allAdminPage,
});

type Hit = Awaited<ReturnType<typeof searchApi4all>>["hits"][number];
type JobStatus = Awaited<ReturnType<typeof getA4aJobStatus>>;

function Api4allAdminPage() {
  const [status, setStatus] = useState<string>("Not tested");
  const [busy, setBusy] = useState(false);
  const [by, setBy] = useState<"reg_no" | "name">("reg_no");
  const [query, setQuery] = useState("C4404");
  const [hits, setHits] = useState<Hit[]>([]);
  const [code, setCode] = useState("");
  const [output, setOutput] = useState("");
  const [job, setJob] = useState<JobStatus | null>(null);

  const refreshJob = () => {
    getA4aJobStatus()
      .then(setJob)
      .catch(() => undefined);
  };
  useEffect(refreshJob, []);

  const callbackUrl = job?.callbackToken
    ? `${typeof window === "undefined" ? "" : window.location.origin}/api/public/a4a-callback?token=${job.callbackToken}`
    : null;


  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${label} failed`, { description: message });
      setOutput(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="mt-2 font-serif text-3xl">API4ALL integration</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Authenticate against API4ALL v3, look up a company code and retrieve the Structure (profile)
          and Credit reports used to fulfil orders.
        </p>
      </header>

      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Connection</h2>
            <p className="text-sm text-muted-foreground">Status: {status}</p>
          </div>
          <Button
            disabled={busy}
            onClick={() =>
              run("Connection test", async () => {
                const result = await checkApi4allConnection();
                if (result.ok) {
                  setStatus(`Connected — token issued (${result.tokenLength} chars)`);
                  toast.success("API4ALL token issued");
                } else {
                  setStatus(`Failed — ${result.message}`);
                  toast.error("Could not authenticate", { description: result.message });
                }
              })
            }
          >
            Test connection
          </Button>
        </div>
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Automatic report collection</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paid structure and credit report items are ordered with API4ALL automatically. A scheduled job
              retries the report every 5 minutes until it is produced, then stores it and emails the client.
            </p>
            <p className="mt-2 text-sm">
              Job state:{" "}
              <span className={job?.paused ? "text-destructive" : "text-emerald-600"}>
                {job ? (job.paused ? "Paused" : "Active") : "Loading…"}
              </span>
              {job?.lastRunAt ? ` · last run ${new Date(job.lastRunAt).toLocaleString("en-GB")}` : ""}
            </p>
            {job?.lastError && <p className="mt-1 text-sm text-destructive">{job.lastError}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                run("Poll", async () => {
                  const result = await runA4aPollNow();
                  setOutput(JSON.stringify(result, null, 2));
                  toast.success("Poll finished");
                  refreshJob();
                })
              }
            >
              Run poll now
            </Button>
            {job?.paused && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run("Resume", async () => {
                    await resumeA4aJob();
                    toast.success("Job resumed");
                    refreshJob();
                  })
                }
              >
                Resume job
              </Button>
            )}
          </div>
        </div>

        {callbackUrl && (
          <div className="mt-4">
            <Label htmlFor="callback">Callback URL for API4ALL (push delivery)</Label>
            <div className="mt-1 flex gap-2">
              <Input id="callback" readOnly value={callbackUrl} className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(callbackUrl);
                  toast.success("Callback URL copied");
                }}
              >
                Copy
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Give this URL to API4ALL to have reports pushed to us as JSON. Keep the token private — it
              authenticates the endpoint.
            </p>
          </div>
        )}
      </section>



      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-medium">1. Find the API4ALL company code</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[120px]">
            <Label htmlFor="by">Search by</Label>
            <select
              id="by"
              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={by}
              onChange={(event) => setBy(event.target.value as "reg_no" | "name")}
            >
              <option value="reg_no">Registration no.</option>
              <option value="name">Company name</option>
            </select>
          </div>
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="query">Query</Label>
            <Input id="query" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run("Search", async () => {
                const result = await searchApi4all({ data: { query, by } });
                setHits(result.hits);
                if (!result.hits.length) toast.info("No matches returned");
              })
            }
          >
            Search
          </Button>
        </div>

        {hits.length > 0 && (
          <ul className="mt-4 divide-y rounded-lg border">
            {hits.map((hit, index) => (
              <li key={`${hit.code ?? index}`} className="flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="font-medium">{hit.name ?? "—"}</span>
                <span className="text-muted-foreground">{hit.regNo ?? ""}</span>
                <span className="ml-auto font-mono text-xs">{hit.code ?? "no code"}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hit.code}
                  onClick={() => {
                    setCode(hit.code ?? "");
                    setOutput(hit.rawJson);
                  }}
                >
                  Use code
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="text-lg font-medium">2. Fetch a report</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1">
            <Label htmlFor="code">API4ALL code</Label>
            <Input
              id="code"
              value={code}
              placeholder="CY00001234406861"
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          {(["structure", "credit"] as A4AReportKind[]).map((kind) => (
            <Button
              key={kind}
              disabled={busy || !code.trim()}
              onClick={() =>
                run(`${kind} report`, async () => {
                  const result = await getApi4allReport({ data: { kind, code } });
                  if (!result.ok) {
                    setOutput(result.message ?? "No report available.");
                    toast.error(result.message ?? "No report available.");
                    return;
                  }
                  setOutput(result.reportJson);
                  toast.success(`${kind === "structure" ? "Structure" : "Credit"} report retrieved`);
                })
              }
            >
              Get {kind === "structure" ? "Structure (profile)" : "Credit"} report
            </Button>
          ))}
          {(["structure", "credit"] as A4AReportKind[]).map((kind) => (
            <Button
              key={`order-${kind}`}
              variant="outline"
              disabled={busy || !code.trim()}
              onClick={() =>
                run(`${kind} order`, async () => {
                  const result = await orderApi4allReport({
                    data: { kind, code, reference: `CHC-${Date.now()}` },
                  });
                  setOutput(result.resultJson);
                  toast.success("Order submitted");
                })
              }
            >
              Order {kind}
            </Button>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          If a report is not yet available for a company, place an order first — API4ALL produces it and
          the report endpoint then returns the data.
        </p>
      </section>

      {output && (
        <section className="mt-6 rounded-xl border bg-card p-5">
          <h2 className="text-lg font-medium">Response</h2>
          <pre className="mt-3 max-h-[520px] overflow-auto rounded-lg bg-muted p-4 text-xs">{output}</pre>
        </section>
      )}
    </div>
  );
}
