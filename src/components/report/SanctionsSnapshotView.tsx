import type { SanctionsSnapshot } from "@/lib/sanctions/snapshot.server";
import { SUBJECT_ROLE_LABEL } from "@/lib/sanctions/screening-scope";
import { formatDate } from "@/lib/format";

/**
 * Customer-facing Sanctions Risk Snapshot.
 * Entity records only — no natural person, and no personal identifier, is rendered.
 */
export function SanctionsSnapshotView({
  snapshot,
  meta,
}: {
  snapshot: SanctionsSnapshot;
  meta: { reference: string; productName: string };
}) {
  const outcomeTone =
    snapshot.outcome === "confirmed_entity_match_identified"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : snapshot.outcome === "potential_entity_match_identified"
        ? "border-amber-400/50 bg-amber-50 text-amber-900"
        : "border-border bg-muted/40 text-foreground";

  return (
    <article className="space-y-8 print:space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {meta.productName} · Order {meta.reference}
        </p>
        <h1 className="text-2xl font-semibold">{snapshot.company.currentLegalName}</h1>
        <p className="text-sm text-muted-foreground">
          {snapshot.company.registrationNumber ?? "—"} · {snapshot.company.jurisdiction} · Screened{" "}
          {formatDate(snapshot.screenedAt)}
        </p>
      </header>

      <section className={`rounded-lg border p-4 ${outcomeTone}`}>
        <h2 className="text-base font-semibold">{snapshot.outcomeTitle}</h2>
        <p className="mt-1 text-sm">{snapshot.outcomeStatement}</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Subjects screened</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Row label="Current legal name" value={snapshot.company.currentLegalName} />
          <Row label="Registration number" value={snapshot.company.registrationNumber} />
          <Row label="Jurisdiction" value={snapshot.company.jurisdiction} />
          <Row label="Registered address" value={snapshot.company.registeredAddress} />
          <Row label="Previous names screened" value={snapshot.previousNamesScreened.join("; ") || "None held in our records"} />
          <Row
            label="Corporate shareholders screened"
            value={snapshot.corporateShareholdersScreened.join("; ") || "None available"}
          />
        </dl>
        {snapshot.notScreened.length ? (
          <div className="rounded-md border p-3 text-sm">
            <p className="font-medium">Not screened</p>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground">
              {snapshot.notScreened.map((n) => (
                <li key={`${n.category}-${n.subject}`}>
                  {n.subject} — {n.reason}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Official sources checked</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-1">Source</th>
              <th className="py-1">Source version (import)</th>
              <th className="py-1">Source file SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.sources.map((s) => (
              <tr key={s.sourceCode} className="border-b last:border-0">
                <td className="py-1">{s.sourceCode.replace(/_/g, " ")}</td>
                <td className="py-1">{s.importId ?? "Not available at screening time"}</td>
                <td className="py-1 font-mono text-xs break-all">{s.fileHash ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-muted-foreground">
          Matching rules version {snapshot.rulesVersion} · Scope {snapshot.scopeVersion}
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Screening results</h2>
        {snapshot.runs.map((run) => (
          <div key={run.reference} className="rounded-md border p-3">
            <p className="text-sm font-medium">
              {SUBJECT_ROLE_LABEL[run.role]}: {run.subjectName}
            </p>
            <p className="text-xs text-muted-foreground">Reference {run.reference}</p>
            {run.candidates.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No entity records were returned above the configured threshold for this subject.
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {run.candidates.map((c, i) => (
                  <li key={`${run.reference}-${i}`} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{c.recordName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.sourceCode.replace(/_/g, " ")}
                      {c.officialRecordId ? ` · record ${c.officialRecordId}` : ""}
                      {c.programme ? ` · ${c.programme}` : ""}
                      {c.designationDate ? ` · designated ${formatDate(c.designationDate)}` : ""}
                    </p>
                    <p className="mt-1 text-xs">
                      Name used: {c.nameUsed} → matched {c.matchedName}
                      {c.nameSimilarity != null ? ` (similarity ${(c.nameSimilarity * 100).toFixed(0)}%)` : ""} · score{" "}
                      {c.matchScore} · {c.classification.replace(/_/g, " ")}
                      {c.analystDecision ? ` · analyst: ${c.analystDecision.decision.replace(/_/g, " ")}` : ""}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <AttrList title="Matching attributes" items={c.matching} />
                      <AttrList title="Conflicting attributes" items={c.conflicting} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-semibold">Data limitations</h2>
        <ul className="list-disc pl-5 text-sm text-muted-foreground">
          {snapshot.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="rounded-md border p-3 text-sm">{snapshot.individualsExcludedNotice}</p>
      </section>
    </article>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd>{value ?? "—"}</dd>
    </div>
  );
}

function AttrList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {items.length ? (
        <ul className="list-disc pl-5 text-xs">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">None recorded</p>
      )}
    </div>
  );
}
