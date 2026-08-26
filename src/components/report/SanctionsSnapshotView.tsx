import type { SanctionsSnapshot, SnapshotCandidate } from "@/lib/sanctions/snapshot";
import { SUBJECT_ROLE_LABEL } from "@/lib/sanctions/screening-scope";
import { formatDate } from "@/lib/format";
import {
  SCREENING_STATUS,
  statusForClassification,
  statusForOutcome,
  type ScreeningStatusKey,
  type SourceStatusKey,
} from "@/lib/sanctions/status-system";
import {
  ScreeningStatusBadge,
  ScreeningStatusBanner,
  SourceStatusBadge,
} from "@/components/screening/ScreeningStatus";

/**
 * Customer-facing Sanctions Risk Snapshot.
 * Entity records only — no natural person, and no personal identifier, is rendered.
 * Internal numeric match scores are never shown to the customer.
 */
export function SanctionsSnapshotView({
  snapshot,
  meta,
}: {
  snapshot: SanctionsSnapshot;
  meta: { reference: string; productName: string };
}) {
  const candidates = snapshot.runs.flatMap((r) => r.candidates);
  const hasStrongCandidate = candidates.some((c) => candidateStatus(c) === "strong_entity_match");
  const analystReviewPending =
    snapshot.outcome !== "confirmed_entity_match_identified" &&
    candidates.some((c) => !c.analystDecision && c.classification !== "rejected");

  const status = statusForOutcome(snapshot.outcome, { hasStrongCandidate });
  const style = SCREENING_STATUS[status];

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

      <ScreeningStatusBanner
        status={status}
        title={status === "strong_entity_match" ? "Strong entity match identified" : snapshot.outcomeTitle}
        statement={status === "strong_entity_match" ? style.explanation : snapshot.outcomeStatement}
      >
        {analystReviewPending ? <ScreeningStatusBadge status="analyst_review_pending" /> : null}
      </ScreeningStatusBanner>

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
              <th className="py-1">Result</th>
              <th className="py-1">Source version (import)</th>
              <th className="py-1">Source file SHA-256</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.sources.map((s) => (
              <tr key={s.sourceCode} className="border-b last:border-0">
                <td className="py-1 uppercase">{s.sourceCode.replace(/_/g, " ")}</td>
                <td className="py-1">
                  <SourceStatusBadge source={sourceStatus(s, candidates)} />
                </td>
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
              <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <ScreeningStatusBadge status="no_matches_identified" />
                No entity records were returned above the configured threshold for this subject.
              </p>
            ) : (
              <ul className="mt-2 space-y-3">
                {run.candidates.map((c, i) => (
                  <CandidateCard key={`${run.reference}-${i}`} candidate={c} subjectName={run.subjectName} />
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

function CandidateCard({ candidate, subjectName }: { candidate: SnapshotCandidate; subjectName: string }) {
  const status = candidateStatus(candidate);
  const style = SCREENING_STATUS[status];
  return (
    <li className={`rounded-md border p-3 text-sm ${style.bg} ${style.leftBorder}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className={`font-semibold ${style.text}`}>{candidate.recordName}</p>
        <ScreeningStatusBadge status={status} className="bg-background" />
      </div>
      <p className="mt-1 text-sm text-foreground">
        Relationship: name screened “{candidate.nameUsed}” for {subjectName} matched the listed record “
        {candidate.matchedName}”.
      </p>
      <p className="mt-1 text-xs text-foreground/80">
        {candidate.sourceCode.replace(/_/g, " ").toUpperCase()}
        {candidate.officialRecordId ? ` · record ${candidate.officialRecordId}` : ""}
        {candidate.programme ? ` · ${candidate.programme}` : ""}
        {candidate.designationDate ? ` · designated ${formatDate(candidate.designationDate)}` : ""}
      </p>
      {candidate.analystDecision ? (
        <p className="mt-1 text-xs text-foreground/80">
          Analyst determination: {candidate.analystDecision.decision.replace(/_/g, " ")}
          {candidate.analystDecision.reviewedAt ? ` · ${formatDate(candidate.analystDecision.reviewedAt)}` : ""}
        </p>
      ) : (
        <p className="mt-1 text-xs text-foreground/80">
          Identity determination is pending analyst review.
        </p>
      )}
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <AttrList title="Matching attributes" items={candidate.matching} />
        <AttrList title="Conflicting attributes" items={candidate.conflicting} />
      </div>
    </li>
  );
}

function candidateStatus(c: SnapshotCandidate): ScreeningStatusKey {
  return statusForClassification(c.classification, c.analystDecision?.decision, {
    exactName: c.nameSimilarity != null && c.nameSimilarity >= 0.999,
    hasConflicts: c.conflicting.length > 0,
  });
}

/** Per-source result derived from the candidates returned for that source. */
function sourceStatus(
  source: { sourceCode: string; importId: string | null },
  candidates: SnapshotCandidate[],
): SourceStatusKey {
  if (!source.importId) return "unavailable";
  const own = candidates.filter((c) => c.sourceCode === source.sourceCode);
  if (own.some((c) => c.analystDecision?.decision === "confirmed_match")) return "checked_confirmed";
  if (own.some((c) => candidateStatus(c) === "strong_entity_match")) return "checked_candidate";
  if (own.some((c) => c.classification !== "rejected")) return "checked_candidate";
  return "checked_no_candidate";
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

export type { ScreeningStatusKey };
