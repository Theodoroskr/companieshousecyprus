import { Link } from "@tanstack/react-router";
import { displayOfficialNo } from "@/lib/format";
import { companyCanonicalSlug } from "@/lib/slug";

export type CompanyListRow = {
  slug: string;
  canonical_slug?: string | null;
  name: string;
  official_no?: string | null;
  type_code?: string | null;
  reg_number?: number | null;
  status_en?: string | null;
  district_en?: string | null;
};

/**
 * Shared listing used by the directory, A–Z and district pages.
 *
 * Mobile notes: rows stack instead of wrapping mid-line, the name is clamped
 * to two lines so a long registry name never pushes the layout wide, and
 * `content-visibility: auto` lets the browser skip layout/paint for rows that
 * are off-screen — which is what keeps scrolling a 50-row list smooth on a
 * phone.
 */
export function CompanyList({
  rows,
  emptyLabel = "No companies found.",
}: {
  rows: CompanyListRow[];
  emptyLabel?: string;
}) {
  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-panel">
      {rows.length === 0 && (
        <li className="p-8 text-center text-sm text-muted-foreground sm:p-10">{emptyLabel}</li>
      )}
      {rows.map((company) => (
        <li
          key={company.slug}
          className="transition-colors hover:bg-muted/50"
          style={{ contentVisibility: "auto", containIntrinsicSize: "auto 76px" }}
        >
          <Link
            to="/company/$slug"
            params={{ slug: companyCanonicalSlug(company as never) }}
            className="flex flex-col gap-1.5 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-4"
          >
            <span className="min-w-0">
              <span className="block break-words font-medium leading-snug line-clamp-2">
                {company.name}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground sm:text-sm">
                {displayOfficialNo(company as never)}
                {company.district_en && ` · ${company.district_en}`}
              </span>
            </span>
            {company.status_en && (
              <span className="w-fit shrink-0 rounded-full border bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground sm:px-3 sm:py-1 sm:text-xs">
                {company.status_en}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
