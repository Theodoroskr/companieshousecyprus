import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { INDIVIDUALS_EXCLUDED_NOTICE } from "@/lib/sanctions/screening-scope";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScreeningStatusBadge } from "@/components/screening/ScreeningStatus";
import { statusForClassification, statusForOutcome } from "@/lib/sanctions/status-system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  fetchScreeningResult,
  runCompanyScreening,
  runScreeningTest,
  searchRegisterForScreening,
  submitAnalystDecision,
} from "@/lib/screening.functions";

export const Route = createFileRoute("/_authenticated/admin/screening")({
  component: ScreeningWorkbench,
});

const ALL_SOURCES = ["EU_FSF", "UN_CONSOLIDATED", "UKSL", "OFAC_SDN"] as const;
type Source = (typeof ALL_SOURCES)[number];

type Mode = "register" | "company";

/** Analyst-facing wording for aggregate outcomes; colours come from the
 * shared screening status system so every surface reads the same. */
const OUTCOME_LABELS: Record<string, string> = {
  confirmed_match_identified: "Confirmed direct entity match",
  potential_match_identified: "Potential entity match",
  no_match_above_threshold: "No matches identified",
  screening_incomplete: "Screening incomplete",
  source_unavailable: "Source unavailable",
};

const CLASS_LABELS: Record<string, string> = {
  strong_candidate: "Strong candidate",
  potential_candidate: "Potential candidate",
  weak_candidate: "Weak candidate",
  rejected: "Rejected",
};

const DECISIONS = [
  ["confirmed_match", "Confirm match"],
  ["potential_match", "Mark potential"],
  ["false_positive", "Mark false positive"],
  ["insufficient_information", "Request more information"],
  ["escalated", "Escalate"],
] as const;

function ScreeningWorkbench() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("register");
  const [sources, setSources] = useState<Source[]>([...ALL_SOURCES]);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [companyRun, setCompanyRun] = useState<{
    reference: string;
    runs: { reference: string; subjectName: string; role: string; outcome: string }[];
    notScreened: { subject: string; category: string; reason: string }[];
    overallOutcome: string;
    ownershipNote: string;
  } | null>(null);

  // register-company picker
  const [registerQuery, setRegisterQuery] = useState("");
  const [slug, setSlug] = useState("");
  // manual fields
  const [form, setForm] = useState({
    name: "", previousNames: "", aliases: "", jurisdiction: "", registrationNumber: "",
    lei: "", dateOfBirth: "", nationality: "", country: "", identificationNumber: "", address: "",
  });

  const registerSearch = useQuery({
    queryKey: ["screening-register-search", registerQuery],
    queryFn: () => searchRegisterForScreening({ data: { q: registerQuery } }),
    enabled: mode === "register" && registerQuery.trim().length >= 2,
  });

  const runTest = useMutation({
    mutationFn: async () => {
      const split = (v: string) => v.split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
      if (mode === "register") {
        const result = await runCompanyScreening({ data: { slug, sources } });
        setCompanyRun({
          reference: result.companyRequest.reference,
          runs: result.runs.map((r) => ({ reference: r.reference, subjectName: r.subjectName, role: r.role, outcome: r.outcome })),
          notScreened: result.notScreened,
          overallOutcome: result.overallOutcome,
          ownershipNote: result.ownershipNote,
        });
        return result.companyRequest;
      }
      setCompanyRun(null);
      return runScreeningTest({
        data: {
          subject: {
            subjectType: "entity",
            name: form.name,
            previousNames: split(form.previousNames),
            aliases: split(form.aliases),
            jurisdiction: form.jurisdiction || null,
            registrationNumber: form.registrationNumber || null,
            lei: form.lei || null,
            country: form.country || null,
            address: form.address || null,
          },
          sources,
        },
      });
    },
    onSuccess: (result) => {
      setRequestId(result.requestId);
      queryClient.invalidateQueries({ queryKey: ["screening-result", result.requestId] });
    },
  });

  const result = useQuery({
    queryKey: ["screening-result", requestId],
    queryFn: () => fetchScreeningResult({ data: { requestId: requestId! } }),
    enabled: Boolean(requestId),
  });

  const decision = useMutation({
    mutationFn: (input: { candidateId: string; decision: (typeof DECISIONS)[number][0]; rationale: string }) =>
      submitAnalystDecision({ data: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["screening-result", requestId] }),
  });

  const toggleSource = (s: Source) =>
    setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const canSubmit =
    sources.length > 0 &&
    (mode === "register" ? Boolean(slug) : form.name.trim().length >= 2);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Sanctions screening test</h1>
        <p className="text-sm text-muted-foreground">
          Internal workbench — results are not customer-facing. Screenings never return “clear/safe” outcomes; matches always require analyst judgement.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Subject</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([["register", "Cyprus register company"], ["company", "Manual company"]] as const).map(([m, label]) => (
              <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>{label}</Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Sources:</span>
            {ALL_SOURCES.map((s) => (
              <label key={s} className="flex items-center gap-1.5">
                <input type="checkbox" checked={sources.includes(s)} onChange={() => toggleSource(s)} />
                {s.replace("_", " ")}
              </label>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setSources([...ALL_SOURCES])}>All</Button>
          </div>

          {mode === "register" ? (
            <div className="space-y-2">
              <Input placeholder="Search the Cyprus register…" value={registerQuery} onChange={(e) => { setRegisterQuery(e.target.value); setSlug(""); }} />
              {registerQuery.length >= 2 && !slug ? (
                <ul className="max-h-56 overflow-auto rounded-md border text-sm">
                  {(registerSearch.data ?? []).map((c) => (
                    <li key={c.slug}>
                      <button type="button" className="w-full px-3 py-2 text-left hover:bg-muted" onClick={() => { setSlug(c.slug); setRegisterQuery(c.name); }}>
                        {c.name} <span className="text-muted-foreground">— HE {c.reg_number} · {c.status_en}</span>
                      </button>
                    </li>
                  ))}
                  {registerSearch.data?.length === 0 ? <li className="px-3 py-2 text-muted-foreground">No matches</li> : null}
                </ul>
              ) : null}
              {slug ? <p className="text-sm text-muted-foreground">Selected: <code>{slug}</code> — the current legal name, registration number and jurisdiction will be screened. Individuals are not screened in this release.</p> : null}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder={"Company name *"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Previous names (separate with ;)" value={form.previousNames} onChange={(e) => setForm({ ...form, previousNames: e.target.value })} />
              <Input placeholder="Jurisdiction (e.g. Cyprus)" value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })} />
              <Input placeholder="Registration number" value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
              <Input placeholder="LEI" value={form.lei} onChange={(e) => setForm({ ...form, lei: e.target.value })} />
              <Input placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="sm:col-span-2" />
            </div>
          )}

          <Button disabled={!canSubmit || runTest.isPending} onClick={() => runTest.mutate()}>
            {runTest.isPending ? "Screening…" : "Run screening"}
          </Button>
          {runTest.isError ? <p className="text-sm text-red-600">{(runTest.error as Error).message}</p> : null}
        </CardContent>
      </Card>

      {companyRun ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Entity-only screening scope</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Company screening reference: <code>{companyRun.reference}</code></p>
            <p className="flex items-center gap-2">Overall outcome: <OutcomeBadge outcome={companyRun.overallOutcome} /></p>
            <ul className="space-y-1">
              {companyRun.runs.map((r) => (
                <li key={r.reference} className="flex flex-wrap items-center gap-2">
                  <code className="text-xs">{r.reference}</code>
                  <span>{r.subjectName}</span>
                  <Badge variant="outline">{r.role.replace(/_/g, " ")}</Badge>
                  <OutcomeBadge outcome={r.outcome} />
                </li>
              ))}
            </ul>
            {companyRun.notScreened.length ? (
              <div className="rounded-md border p-2">
                <p className="font-medium">Not screened</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {companyRun.notScreened.map((n) => (
                    <li key={`${n.category}-${n.subject}`}>{n.subject} — {n.reason}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900">{companyRun.ownershipNote}</p>
            <p className="rounded-md border p-2 text-muted-foreground">{INDIVIDUALS_EXCLUDED_NOTICE}</p>
          </CardContent>
        </Card>
      ) : null}

      {result.data ? <ResultView data={result.data} onDecision={(input) => decision.mutate(input)} decisionPending={decision.isPending} /> : null}
    </div>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  return (
    <ScreeningStatusBadge
      status={statusForOutcome(outcome)}
      label={OUTCOME_LABELS[outcome] ?? outcome.replace(/_/g, " ")}
    />
  );
}

type ResultData = Awaited<ReturnType<typeof fetchScreeningResult>>;

function ResultView({ data, onDecision, decisionPending }: { data: ResultData; onDecision: (input: { candidateId: string; decision: (typeof DECISIONS)[number][0]; rationale: string }) => void; decisionPending: boolean }) {
  const { request, candidates, audit } = data;
  const imports = (request.source_import_ids ?? {}) as Record<string, { importId: string | null; fileHash: string | null; completedAt: string | null }>;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3 text-base">
          Screening result
          <OutcomeBadge outcome={request.outcome ?? ""} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <div><span className="text-muted-foreground">Reference:</span> <code>{request.screening_reference}</code></div>
          <div><span className="text-muted-foreground">Screened:</span> {request.subject_name} ({request.subject_type})</div>
          <div><span className="text-muted-foreground">Completed:</span> {request.completed_at ? new Date(request.completed_at).toLocaleString("en-GB") : "—"}</div>
          <div><span className="text-muted-foreground">Rules:</span> {request.rules_version}</div>
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Source versions:</span>
            <ul className="mt-1 space-y-0.5">
              {Object.entries(imports).map(([code, meta]) => (
                <li key={code} className="text-xs">
                  <strong>{code}</strong> — import <code>{meta.importId ? meta.importId.slice(0, 8) : "none"}</code>
                  {meta.fileHash ? <> · sha256 <code>{meta.fileHash.slice(0, 12)}…</code></> : null}
                  {meta.completedAt ? <> · {new Date(meta.completedAt).toLocaleDateString("en-GB")}</> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {candidates.length === 0 ? (
          <p className="rounded-md border p-3 text-muted-foreground">No candidate matches above the configured threshold.</p>
        ) : (
          <div className="space-y-3">
            {candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} onDecision={onDecision} pending={decisionPending} />
            ))}
          </div>
        )}

        <details>
          <summary className="cursor-pointer text-muted-foreground">Audit trail ({audit.length} events)</summary>
          <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(audit, null, 2)}</pre>
        </details>
      </CardContent>
    </Card>
  );
}

type Candidate = ResultData["candidates"][number];

function CandidateCard({ candidate: c, onDecision, pending }: { candidate: Candidate; onDecision: (input: { candidateId: string; decision: (typeof DECISIONS)[number][0]; rationale: string }) => void; pending: boolean }) {
  const [rationale, setRationale] = useState("");
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{c.source_code}</Badge>
        <span className="font-medium">{c.primary_name}</span>
        <ScreeningStatusBadge
          status={statusForClassification(c.system_classification, c.decision?.decision, {
            exactName: Number(c.name_similarity) >= 0.999,
            hasConflicts: (c.conflicting as string[]).length > 0,
            identifierMatch: Boolean(c.identifier_match),
            decisionSource: c.decision?.decision_source ?? null,
          })}
          label={CLASS_LABELS[c.system_classification] ?? c.system_classification}
        />
        <span className="text-muted-foreground">score {Number(c.match_score).toFixed(1)} · level {c.match_level}</span>
        {c.identifier_match ? <Badge variant="outline">identifier match</Badge> : null}
        {c.decision ? <Badge variant="secondary">analyst: {c.decision.decision.replace(/_/g, " ")}</Badge> : null}
      </div>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div><dt className="text-muted-foreground">Official record</dt><dd><code>{c.official_record_id}</code></dd></div>
        <div><dt className="text-muted-foreground">Authority</dt><dd>{c.authority}</dd></div>
        <div><dt className="text-muted-foreground">Programme</dt><dd>{c.programme ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Matched on</dt><dd>{c.matched_name} ({c.matched_alias_type ?? "primary"}, similarity {Number(c.name_similarity).toFixed(2)})</dd></div>
        <div><dt className="text-muted-foreground">Corroborating</dt><dd>{(c.corroborating as string[]).join("; ") || "—"}</dd></div>
        <div><dt className="text-muted-foreground">Conflicting</dt><dd className={(c.conflicting as string[]).length ? "text-screening-confirmed" : ""}>{(c.conflicting as string[]).join("; ") || "none"}</dd></div>
        {c.source_link ? <div><dt className="text-muted-foreground">Source</dt><dd><a className="underline" href={c.source_link} target="_blank" rel="noreferrer">official list</a></dd></div> : null}
      </dl>
      <details className="mt-1 text-xs">
        <summary className="cursor-pointer text-muted-foreground">Score breakdown</summary>
        <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
          {Object.entries(c.contributions as Record<string, number>).map(([k, v]) => (
            <li key={k} className="flex justify-between border-b border-dotted"><span>{k.replace(/_/g, " ")}</span><span className={v < 0 ? "text-red-700" : ""}>{v > 0 ? `+${v}` : v}</span></li>
          ))}
        </ul>
      </details>

      <div className="mt-2">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>{open ? "Hide analyst actions" : "Analyst actions"}</Button>
        {open ? (
          <div className="mt-2 space-y-2 rounded-md border bg-muted/40 p-3">
            <Textarea placeholder="Written rationale (required)…" value={rationale} onChange={(e) => setRationale(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {DECISIONS.map(([value, label]) => (
                <Button key={value} size="sm" variant={value === "confirmed_match" ? "default" : "outline"} disabled={pending || rationale.trim().length < 5}
                  onClick={() => onDecision({ candidateId: c.id, decision: value, rationale })}>
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Decisions never modify the official sanctions record.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
