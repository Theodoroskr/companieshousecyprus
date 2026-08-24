import { addressToString, reportNumber, type ParsedReport, type ReportParty } from "@/lib/reports/parser";
import { formatDate } from "@/lib/format";

const date = (value?: string | null) => (value ? (formatDate(value) ?? value) : "—");

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="report-section break-inside-avoid rounded-xl border bg-card p-5 shadow-panel">
      <header className="mb-4 border-b pb-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-words">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number | null)[][] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No records disclosed.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
            {head.map((cell) => (
              <th key={cell} className="py-2 pr-3 font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b last:border-0 align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="py-2 pr-3">
                  {cell === null || cell === "" ? "—" : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const partyRows = (parties: ReportParty[], withShares: boolean) =>
  parties.map((person) => [
    person.name + (person.isCompany ? " (entity)" : ""),
    withShares ? `${person.shares || "—"}${person.sharesPercentage ? ` · ${person.sharesPercentage}%` : ""}` : person.position || "—",
    person.identifier || "—",
    person.nationality || (person.isCompany ? "—" : "—"),
    date(person.startDate),
    person.active ? "Active" : "Ended",
  ]);

export function ReportView({
  report,
  meta,
}: {
  report: ParsedReport;
  meta: { reference: string; productName: string; deliveredAt?: string | null; watermark?: string | null };
}) {
  const g = report.general;
  const registered = report.general.addresses.find((address) => address.active) ?? report.general.addresses[0];
  const latestScore = report.scoring[0];

  return (
    <div className="report-root space-y-5">
      <header className="rounded-xl border bg-gradient-to-br from-primary to-primary/85 p-6 text-primary-foreground shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
          Companies House Cyprus · {report.kind === "credit" ? "Cyprus Credit Report" : "Cyprus Company Profile"}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          {g.latinName || g.name || "Company report"}
        </h1>
        <p className="mt-1 text-sm text-primary-foreground/80">
          {g.registrationNumber ? `Reg. no. ${g.registrationNumber}` : ""}
          {g.status ? ` · ${g.status}` : ""}
          {g.legalType ? ` · ${g.legalType}` : ""}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-primary-foreground/70">Order</p>
            <p className="font-mono text-sm">{meta.reference}</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-primary-foreground/70">Report generated</p>
            <p className="text-sm">{report.generatedAt || date(meta.deliveredAt)}</p>
          </div>
          <div className="rounded-lg bg-primary-foreground/10 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wide text-primary-foreground/70">
              {latestScore ? "ICG credit score" : "Registry data updated"}
            </p>
            <p className="text-sm">
              {latestScore
                ? `${latestScore.score ?? "—"}/100 · ${latestScore.description}`
                : g.dateUpdated || "—"}
            </p>
          </div>
        </div>
      </header>

      {meta.watermark ? (
        <p className="rounded-lg border border-copper/40 bg-copper/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-copper">
          {meta.watermark}
        </p>
      ) : null}

      <Section title="Company identity" subtitle={meta.productName}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Registered name" value={g.name} />
          <Field label="Name in Latin characters" value={g.latinName} />
          <Field label="Registration number" value={g.registrationNumber} />
          <Field label="VAT number" value={g.vatNumber} />
          <Field label="Legal type" value={g.legalType} />
          <Field label="Registry status" value={g.status} />
          <Field label="Registered address" value={addressToString(registered)} />
          <Field label="Website" value={g.website} />
          <Field label="Contact" value={[g.phone, g.email].filter(Boolean).join(" · ")} />
        </div>
        {g.dates.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {g.dates.map((entry) => (
              <Field key={`${entry.label}-${entry.date}`} label={entry.label} value={date(entry.date)} />
            ))}
          </div>
        ) : null}
      </Section>

      {report.general.addresses.length > 1 ? (
        <Section title="Address history">
          <Table
            head={["Type", "Address", "City / region", "Postcode", "Status"]}
            rows={report.general.addresses.map((address) => [
              address.type,
              address.line,
              [address.city, address.region].filter(Boolean).join(" / "),
              address.postalCode,
              address.active ? "Current" : "Previous",
            ])}
          />
        </Section>
      ) : null}

      {report.names.length > 0 ? (
        <Section title="Name history">
          <Table
            head={["Name", "Latin", "Type", "Status", "From", "To"]}
            rows={report.names.map((entry) => [
              entry.name,
              entry.latin,
              entry.description,
              entry.status,
              date(entry.startDate),
              entry.endDate ? date(entry.endDate) : "—",
            ])}
          />
        </Section>
      ) : null}

      {report.activities.length > 0 || report.activityNotes.length > 0 ? (
        <Section title="Business activities">
          <Table
            head={["Code", "Classification", "Description"]}
            rows={report.activities.map((activity) => [activity.code, activity.type, activity.description])}
          />
          {report.activityNotes.map((note) => (
            <p key={note} className="mt-3 text-xs text-muted-foreground">
              {note}
            </p>
          ))}
        </Section>
      ) : null}

      <Section title="Directors & secretary">
        <Table
          head={["Name", "Position", "Identifier", "Nationality", "Appointed", "Status"]}
          rows={partyRows(report.administrators, false)}
        />
      </Section>

      <Section title="Shareholders">
        <Table
          head={["Name", "Shares", "Identifier", "Nationality", "From", "Status"]}
          rows={partyRows(report.shareholders, true)}
        />
      </Section>

      {report.ubo.length > 0 ? (
        <Section title="Ultimate beneficial owners">
          <Table
            head={["Name", "Shares", "Identifier", "Nationality", "From", "Status"]}
            rows={partyRows(report.ubo, true)}
          />
        </Section>
      ) : null}

      {report.capitals.length > 0 ? (
        <Section title="Share capital">
          <Table
            head={["Reference date", "Currency", "Nominal shares", "Issued shares", "Nominal price", "Authorised", "Paid up"]}
            rows={report.capitals.map((capital) => [
              date(capital.referenceDate),
              capital.currency,
              capital.nominalShares,
              capital.issuedShares,
              capital.nominalPrice,
              capital.authorisedCapital,
              capital.paidUpCapital,
            ])}
          />
        </Section>
      ) : null}

      <Section title="Mortgages & charges">
        <Table
          head={["Kind", "Type", "Amount", "Beneficiary", "Registered", "Released"]}
          rows={report.charges.map((charge) => [
            charge.kind,
            charge.type,
            `${charge.currency === "EUR" ? "€" : `${charge.currency} `}${charge.amount}`,
            charge.beneficiary,
            date(charge.dateRegistered),
            charge.endDate ? date(charge.endDate) : "Outstanding",
          ])}
        />
      </Section>

      {report.related.length > 0 ? (
        <Section title="Corporate structure">
          <Table
            head={["Relation", "Company", "Reg. no.", "Holding", "Status", "Address"]}
            rows={report.related.map((entry) => [
              entry.role,
              entry.name,
              entry.registrationNumber,
              entry.percentage ? `${entry.percentage}%` : "—",
              entry.status,
              entry.address,
            ])}
          />
        </Section>
      ) : null}

      {report.branches.length > 0 ? (
        <Section title="Branches">
          <Table
            head={["Relation", "Company", "Reg. no.", "Status", "Address"]}
            rows={report.branches.map((entry) => [
              entry.role,
              entry.name,
              entry.registrationNumber,
              entry.status,
              entry.address,
            ])}
          />
        </Section>
      ) : null}

      {report.scoring.length > 0 ? (
        <Section title="ICG credit scoring" subtitle="Score out of 100 with the advised credit limit per financial year.">
          <Table
            head={["Financial year", "Score", "Risk band", "Advised credit limit", "Estimated"]}
            rows={report.scoring.map((row) => [
              row.year,
              row.score,
              row.description,
              row.creditLimit,
              row.estimatedAt,
            ])}
          />
        </Section>
      ) : null}

      {report.ratios.length > 0 ? (
        <Section title="Key financial ratios" subtitle={report.ratios[0]?.type}>
          <div className="space-y-5">
            {report.ratios.map((set) => (
              <div key={`${set.year}-${set.type}`} className="break-inside-avoid">
                <p className="mb-2 text-sm font-semibold">{set.year}</p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {set.blocks.map((block) => (
                    <div key={block.heading} className="rounded-lg border bg-muted/20 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-copper">{block.heading}</p>
                      <ul className="space-y-1 text-xs">
                        {block.entries.map((entry) => (
                          <li key={entry.name} className="flex justify-between gap-3">
                            <span className="text-muted-foreground">{entry.name}</span>
                            <span className="font-medium">{reportNumber(entry.value)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {report.incomeStatements.length > 0 ? (
        <Section title="Statement of profit and loss" subtitle={report.incomeStatements[0]?.type}>
          <StatementBlocks statements={report.incomeStatements} />
        </Section>
      ) : null}

      {report.balanceSheets.length > 0 ? (
        <Section title="Statement of financial position" subtitle={report.balanceSheets[0]?.type}>
          <StatementBlocks statements={report.balanceSheets} />
        </Section>
      ) : null}

      <Section title="Negative information">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unpaid bills on record" value={String(report.negatives.unpaidBills)} />
          <Field label="Bankruptcy filings" value={String(report.negatives.bankruptcies)} />
        </div>
        {report.detrimental.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold">Detrimental information in the corporate structure</p>
            <Table
              head={["Category", "Entity", "Reg. no.", "Detail"]}
              rows={report.detrimental.map((entry) => [entry.label, entry.company, entry.registrationNumber, entry.detail])}
            />
          </div>
        ) : null}
      </Section>

      <footer className="rounded-xl border bg-muted/30 p-5 text-xs leading-relaxed text-muted-foreground">
        <p className="font-semibold text-foreground">Companies House Cyprus · info@companieshousecyprus.com</p>
        <p className="mt-2">
          Compiled from the disclosed information of the Cyprus Registrar of Companies and Infocredit Group data
          sources. Scores, ratios and credit limits are analytical opinions, not a recommendation to grant credit.
          {report.icgId ? ` Source reference ${report.icgId}.` : ""}
        </p>
        <p className="mt-2">
          Order {meta.reference} · {meta.productName}
          {meta.deliveredAt ? ` · Delivered ${date(meta.deliveredAt)}` : ""}
        </p>
      </footer>
    </div>
  );
}

function StatementBlocks({ statements }: { statements: ParsedReport["balanceSheets"] }) {
  return (
    <div className="space-y-6">
      {statements.map((statement) => (
        <div key={`${statement.year}-${statement.type}`} className="break-inside-avoid">
          <p className="mb-2 text-sm font-semibold">
            {statement.year} <span className="font-normal text-muted-foreground">({statement.currency})</span>
          </p>
          <div className="space-y-4">
            {statement.groups.map((group) => (
              <div key={group.heading}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-copper">{group.heading}</p>
                <ul className="divide-y text-sm">
                  {group.lines.map((line, index) => (
                    <li
                      key={`${line.name}-${index}`}
                      className={`flex justify-between gap-4 py-1.5 ${line.emphasis ? "font-semibold" : ""}`}
                    >
                      <span className={line.emphasis ? "" : "text-muted-foreground"}>{line.name}</span>
                      <span className="tabular-nums">{reportNumber(line.value, statement.currency)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
