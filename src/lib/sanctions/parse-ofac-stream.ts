/**
 * Streaming parser for the OFAC SDN Advanced XML (~126 MB) export.
 *
 * The in-memory parser (parse-ofac.ts) needs the full document as one string
 * plus section copies, which peaks near 1 GB RSS — too much for the standard
 * function runtime. This parser consumes decoded text chunk-by-chunk and
 * extracts complete top-level blocks as they arrive, so peak memory is the
 * join maps (parties, locations, ID documents) plus a small look-ahead
 * buffer, never the raw document.
 *
 * It reuses the exact same block parsers and record assembly as the
 * in-memory parser, so output records are identical. Sections are handled in
 * document order (ReferenceValueSets → … → SanctionsEntries), which the OFAC
 * export always follows.
 */

import {
  attrs as parseAttrs,
  buildOfacRecord,
  createAssemblyStats,
  parseIdRegDocumentBlock,
  parseLocationBlock,
  parseParty,
  parseRefSet,
  type IdDoc,
  type LocationInfo,
  type OfacAssemblyContext,
  type OfacParseReport,
  type Party,
} from "@/lib/sanctions/parse-ofac";
import type { SanctionsRecord } from "@/lib/sanctions/parse";

const SECTION_CHILD = {
  Locations: "Location",
  IDRegDocuments: "IDRegDocument",
  DistinctParties: "DistinctParty",
  ProfileRelationships: "ProfileRelationship",
  SanctionsEntries: "SanctionsEntry",
} as const;

type ContainerSection = keyof typeof SECTION_CHILD;
type SectionName = "ReferenceValueSets" | ContainerSection;

const SECTION_NAMES: SectionName[] = ["ReferenceValueSets", ...(Object.keys(SECTION_CHILD) as ContainerSection[])];

/** Longest open/close marker we may need to see split across chunks. */
const TAIL_KEEP = 64;

export class OfacStreamParser {
  private buffer = "";
  private sawRoot = false;
  private rootClosed = false;
  private section: SectionName | null = null;

  private readonly aliasTypes = new Map<string, string>();
  private readonly featureTypes = new Map<string, string>();
  private readonly detailRefs = new Map<string, string>();
  private readonly docTypes = new Map<string, string>();
  private readonly countries = new Map<string, string>();
  private readonly legalBases = new Map<string, string>();
  private readonly locPartTypes = new Map<string, string>();

  private readonly locations = new Map<string, LocationInfo>();
  private readonly idDocsByIdentity = new Map<string, IdDoc[]>();
  private readonly parties = new Map<string, Party>();
  private readonly relationshipsByEntry = new Map<string, { related: string; former: boolean }[]>();

  private readonly stats = createAssemblyStats();
  private totalEntries = 0;

  /** Feed decoded text; returns records completed by this chunk. */
  feed(text: string): SanctionsRecord[] {
    if (this.rootClosed) throw new Error("Data received after </Sanctions>");
    this.buffer += text;
    const out: SanctionsRecord[] = [];
    this.pump(out);
    return out;
  }

  /** Signal end of input; returns any records completed by the final bytes.
   *  Throws if the document is incomplete. */
  finish(): { records: SanctionsRecord[]; report: OfacParseReport } {
    const trailing: SanctionsRecord[] = [];
    this.pump(trailing);
    if (!this.sawRoot) throw new Error("Not an OFAC Advanced XML document (missing <Sanctions> root)");
    if (!this.rootClosed) throw new Error("Document is truncated (missing </Sanctions> closing tag)");
    return {
      records: trailing,
      report: {
        totalParties: this.parties.size,
        totalEntries: this.totalEntries,
        skippedNoIdentity: this.stats.skippedNoIdentity,
        duplicateEntryIds: this.stats.duplicateEntryIds,
        partyTypeCounts: this.stats.partyTypeCounts,
      },
    };
  }

  private pump(out: SanctionsRecord[]): void {
    for (;;) {
      if (!this.sawRoot) {
        const i = this.buffer.indexOf("<Sanctions");
        if (i === -1) {
          if (this.buffer.length > TAIL_KEEP) this.buffer = this.buffer.slice(-TAIL_KEEP);
          return;
        }
        this.sawRoot = true;
        this.buffer = this.buffer.slice(i);
        continue;
      }

      if (this.section === null) {
        const rootClose = this.buffer.indexOf("</Sanctions>");
        let bestIdx = -1;
        let bestSection: SectionName | null = null;
        for (const name of SECTION_NAMES) {
          const idx = this.buffer.indexOf(`<${name}>`);
          if (idx !== -1 && (bestIdx === -1 || idx < bestIdx)) {
            bestIdx = idx;
            bestSection = name;
          }
        }
        if (rootClose !== -1 && (bestIdx === -1 || rootClose < bestIdx)) {
          this.rootClosed = true;
          this.buffer = this.buffer.slice(rootClose + "</Sanctions>".length);
          return;
        }
        if (bestSection === null) {
          if (this.buffer.length > TAIL_KEEP) this.buffer = this.buffer.slice(-TAIL_KEEP);
          return;
        }
        this.section = bestSection;
        this.buffer = this.buffer.slice(bestIdx + bestSection.length + 2);
        continue;
      }

      const section = this.section;
      const closeTag = `</${section}>`;
      const closeIdx = this.buffer.indexOf(closeTag);

      if (section === "ReferenceValueSets") {
        const open = /<([A-Za-z]+Values)>/.exec(this.buffer);
        if (open && (closeIdx === -1 || open.index < closeIdx)) {
          const name = open[1]!;
          const endTag = `</${name}>`;
          const endIdx = this.buffer.indexOf(endTag, open.index);
          if (endIdx === -1) return; // wait for the rest of the block
          const blockText = this.buffer.slice(open.index, endIdx + endTag.length);
          this.assignRefSet(name, parseRefSet(blockText, name));
          this.buffer = this.buffer.slice(endIdx + endTag.length);
          continue;
        }
        if (closeIdx !== -1) {
          this.section = null;
          this.buffer = this.buffer.slice(closeIdx + closeTag.length);
          continue;
        }
        return;
      }

      const childTag: string = SECTION_CHILD[section];
      const openIdx = this.buffer.indexOf(`<${childTag} `);
      if (openIdx !== -1 && (closeIdx === -1 || openIdx < closeIdx)) {
        const endTag = `</${childTag}>`;
        const endIdx = this.buffer.indexOf(endTag, openIdx);
        if (endIdx === -1) return; // wait for the rest of the block
        const openTagEnd = this.buffer.indexOf(">", openIdx);
        if (openTagEnd === -1 || openTagEnd > endIdx) return; // malformed; wait for more data
        const block = { attrs: parseAttrs(this.buffer.slice(openIdx, openTagEnd + 1)), body: this.buffer.slice(openTagEnd + 1, endIdx) };
        this.handleBlock(section, block, out);
        this.buffer = this.buffer.slice(endIdx + endTag.length);
        continue;
      }
      if (closeIdx !== -1) {
        this.section = null;
        this.buffer = this.buffer.slice(closeIdx + closeTag.length);
        continue;
      }
      return; // incomplete child block or closing tag; wait for more data
    }
  }

  private assignRefSet(name: string, map: Map<string, string>): void {
    const target =
      name === "AliasTypeValues" ? this.aliasTypes
      : name === "FeatureTypeValues" ? this.featureTypes
      : name === "DetailReferenceValues" ? this.detailRefs
      : name === "IDRegDocTypeValues" ? this.docTypes
      : name === "CountryValues" ? this.countries
      : name === "LegalBasisValues" ? this.legalBases
      : name === "LocPartTypeValues" ? this.locPartTypes
      : null;
    if (!target) return;
    for (const [k, v] of map) target.set(k, v);
  }

  private handleBlock(section: ContainerSection, block: { attrs: Record<string, string>; body: string }, out: SanctionsRecord[]): void {
    switch (section) {
      case "Locations": {
        const parsed = parseLocationBlock(block, this.locPartTypes, this.countries);
        if (parsed) this.locations.set(parsed.id, parsed.info);
        return;
      }
      case "IDRegDocuments": {
        const doc = parseIdRegDocumentBlock(block, this.docTypes, this.countries);
        if (doc && doc.identityId) {
          const list = this.idDocsByIdentity.get(doc.identityId) ?? [];
          list.push(doc);
          this.idDocsByIdentity.set(doc.identityId, list);
        }
        return;
      }
      case "DistinctParties": {
        const party = parseParty(block);
        if (party) this.parties.set(party.profileId, party);
        return;
      }
      case "ProfileRelationships": {
        const entryId = block.attrs["SanctionsEntryID"];
        const related = block.attrs["To-ProfileID"];
        if (entryId !== undefined && related !== undefined) {
          const list = this.relationshipsByEntry.get(entryId) ?? [];
          list.push({ related, former: block.attrs["Former"] === "true" });
          this.relationshipsByEntry.set(entryId, list);
        }
        return;
      }
      case "SanctionsEntries": {
        const record = buildOfacRecord(block, this.assemblyContext(), this.stats);
        if (record) {
          this.totalEntries += 1;
          out.push(record);
        }
        return;
      }
    }
  }

  private assemblyContext(): OfacAssemblyContext {
    return {
      aliasTypes: this.aliasTypes,
      featureTypes: this.featureTypes,
      detailRefs: this.detailRefs,
      countries: this.countries,
      legalBases: this.legalBases,
      locations: this.locations,
      idDocsByIdentity: this.idDocsByIdentity,
      parties: this.parties,
      relationshipsByEntry: this.relationshipsByEntry,
    };
  }
}
