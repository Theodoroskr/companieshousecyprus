import { attrs as parseAttrs, parseRefSet, type Attrs } from "@/lib/sanctions/parse-ofac";

const SECTION_CHILD = {
  Locations: "Location",
  IDRegDocuments: "IDRegDocument",
  DistinctParties: "DistinctParty",
  ProfileRelationships: "ProfileRelationship",
  SanctionsEntries: "SanctionsEntry",
} as const;

export type OfacSection = "ReferenceValueSets" | keyof typeof SECTION_CHILD;
export type OfacCheckpoint = {
  buffer: string;
  sawRoot: boolean;
  rootClosed: boolean;
  section: OfacSection | null;
};

export type OfacBlock =
  | { kind: "reference"; setName: string; values: Array<[string, string]> }
  | { kind: "child"; section: keyof typeof SECTION_CHILD; attrs: Attrs; body: string };

const SECTION_NAMES: OfacSection[] = ["ReferenceValueSets", ...Object.keys(SECTION_CHILD) as Array<keyof typeof SECTION_CHILD>];
const TAIL_KEEP = 64;
export const MAX_OFAC_CARRY_CHARS = 512 * 1024;

export function consumeOfacChunk(state: OfacCheckpoint, text: string): { state: OfacCheckpoint; blocks: OfacBlock[] } {
  let buffer = state.buffer + text;
  let sawRoot = state.sawRoot;
  let rootClosed = state.rootClosed;
  let section = state.section;
  const blocks: OfacBlock[] = [];

  for (;;) {
    if (!sawRoot) {
      const index = buffer.indexOf("<Sanctions");
      if (index === -1) { buffer = buffer.slice(-TAIL_KEEP); break; }
      sawRoot = true;
      buffer = buffer.slice(index);
      continue;
    }
    if (section === null) {
      const rootClose = buffer.indexOf("</Sanctions>");
      let bestIndex = -1;
      let bestSection: OfacSection | null = null;
      for (const name of SECTION_NAMES) {
        const index = buffer.indexOf(`<${name}>`);
        if (index !== -1 && (bestIndex === -1 || index < bestIndex)) { bestIndex = index; bestSection = name; }
      }
      if (rootClose !== -1 && (bestIndex === -1 || rootClose < bestIndex)) {
        rootClosed = true;
        buffer = buffer.slice(rootClose + 12);
        break;
      }
      if (bestSection === null) { buffer = buffer.slice(-TAIL_KEEP); break; }
      section = bestSection;
      buffer = buffer.slice(bestIndex + bestSection.length + 2);
      continue;
    }

    const closeTag = `</${section}>`;
    const closeIndex = buffer.indexOf(closeTag);
    if (section === "ReferenceValueSets") {
      const open = /<([A-Za-z]+Values)>/.exec(buffer);
      if (open && (closeIndex === -1 || open.index < closeIndex)) {
        const setName = open[1];
        if (!setName) break;
        const endTag = `</${setName}>`;
        const endIndex = buffer.indexOf(endTag, open.index);
        if (endIndex === -1) break;
        const xml = buffer.slice(open.index, endIndex + endTag.length);
        blocks.push({ kind: "reference", setName, values: [...parseRefSet(xml, setName)] });
        buffer = buffer.slice(endIndex + endTag.length);
        continue;
      }
    } else {
      const childTag = SECTION_CHILD[section];
      const openIndex = buffer.indexOf(`<${childTag} `);
      if (openIndex !== -1 && (closeIndex === -1 || openIndex < closeIndex)) {
        const endTag = `</${childTag}>`;
        const endIndex = buffer.indexOf(endTag, openIndex);
        if (endIndex === -1) break;
        const openEnd = buffer.indexOf(">", openIndex);
        if (openEnd === -1 || openEnd > endIndex) break;
        blocks.push({ kind: "child", section, attrs: parseAttrs(buffer.slice(openIndex, openEnd + 1)), body: buffer.slice(openEnd + 1, endIndex) });
        buffer = buffer.slice(endIndex + endTag.length);
        continue;
      }
    }
    if (closeIndex !== -1) {
      section = null;
      buffer = buffer.slice(closeIndex + closeTag.length);
      continue;
    }
    break;
  }

  if (buffer.length > MAX_OFAC_CARRY_CHARS) throw new Error(`OFAC XML block exceeds ${MAX_OFAC_CARRY_CHARS} checkpoint characters`);
  return { state: { buffer, sawRoot, rootClosed, section }, blocks };
}

export function finishOfacCheckpoint(state: OfacCheckpoint): void {
  if (!state.sawRoot) throw new Error("Not an OFAC Advanced XML document (missing <Sanctions> root)");
  if (!state.rootClosed) throw new Error("Document is truncated (missing </Sanctions> closing tag)");
}