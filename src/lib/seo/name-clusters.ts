/**
 * Brand-word landing pages.
 *
 * Search demand for the Cyprus register is dominated by exact brand words
 * ("lebensa", "trofilo", "oilex", "trastel") rather than generic registry
 * phrases. Competitor directories capture those queries with a single page per
 * brand word that lists every registry entity carrying it. These clusters give
 * us an indexable page per term that links straight into the company profiles.
 */
export interface NameCluster {
  /** URL segment and the word matched against registry names. */
  term: string;
  /** Display form used in headings and metadata. */
  label: string;
  /** One-line context shown under the heading. */
  intro: string;
}

export const NAME_CLUSTERS: NameCluster[] = [
  {
    term: "lebensa",
    label: "Lebensa",
    intro:
      "Cyprus registry entities whose registered name contains “Lebensa”, with registration numbers, status and registered district.",
  },
  {
    term: "trofilo",
    label: "Trofilo",
    intro:
      "Cyprus registry entities whose registered name contains “Trofilo”, with registration numbers, status and registered district.",
  },
  {
    term: "oilex",
    label: "Oilex",
    intro:
      "Cyprus registry entities whose registered name contains “Oilex”, including the Oilex India, Oman and West Kampar holdings registered in Cyprus.",
  },
  {
    term: "trastel",
    label: "Trastel",
    intro:
      "Cyprus registry entities whose registered name contains “Trastel”, with registration numbers, status and registered district.",
  },
  {
    term: "nemolia",
    label: "Nemolia",
    intro:
      "Cyprus registry entities whose registered name contains “Nemolia”, with registration numbers, status and registered district.",
  },
];

export function findNameCluster(term: string): NameCluster | undefined {
  const key = term.trim().toLowerCase();
  return NAME_CLUSTERS.find((cluster) => cluster.term === key);
}

export function nameClusterPath(cluster: NameCluster): string {
  return `/name/${cluster.term}`;
}
