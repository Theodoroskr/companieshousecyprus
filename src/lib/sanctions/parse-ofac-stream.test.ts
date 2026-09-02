import { describe, expect, it } from "vitest";
import { parseOfac } from "@/lib/sanctions/parse-ofac";
import { OfacStreamParser } from "@/lib/sanctions/parse-ofac-stream";
import { StreamingSha256 } from "@/lib/sanctions/sha256-stream";
import { consumeOfacChunk, finishOfacCheckpoint, type OfacCheckpoint } from "@/lib/sanctions/ofac-checkpoint";
import type { SanctionsRecord } from "@/lib/sanctions/parse";

const DOC = `<?xml version="1.0"?>
<Sanctions xmlns="http://example.com/ofac">
<ReferenceValueSets>
  <AliasTypeValues><AliasType ID="1403">Name</AliasType></AliasTypeValues>
  <FeatureTypeValues><FeatureType ID="8">Birthdate</FeatureType><FeatureType ID="224">Gender</FeatureType></FeatureTypeValues>
  <DetailReferenceValues><DetailReference ID="1">ref</DetailReference></DetailReferenceValues>
  <IDRegDocTypeValues><IDRegDocType ID="1571">Passport</IDRegDocType></IDRegDocTypeValues>
  <LocPartTypeValues><LocPartType ID="1454">CITY</LocPartType></LocPartTypeValues>
  <CountryValues><Country ID="22222">Cuba</Country></CountryValues>
  <LegalBasisValues><LegalBasis ID="1">Executive Order 13224</LegalBasis></LegalBasisValues>
</ReferenceValueSets>
<Locations>
  <Location ID="26"><LocationPart LocPartTypeID="1454"><LocationPartValue><Value>Havana</Value></LocationPartValue></LocationPart><LocationCountry CountryID="22222" /></Location>
</Locations>
<IDRegDocuments>
  <IDRegDocument ID="2" IDRegDocTypeID="1571" IdentityID="6746" IssuedBy-CountryID="22222"><IDRegistrationNo>P12345</IDRegistrationNo></IDRegDocument>
</IDRegDocuments>
<DistinctParties>
  <DistinctParty FixedRef="2674">
    <Profile ID="2674" PartySubTypeID="4">
      <Identity ID="6746" Primary="true">
        <Alias AliasTypeID="1403" Primary="true" LowQuality="false">
          <DocumentedName ID="6746"><DocumentedNamePart><NamePartValue ScriptID="215">ABBAS</NamePartValue></DocumentedNamePart><DocumentedNamePart><NamePartValue ScriptID="215">Abu</NamePartValue></DocumentedNamePart></DocumentedName>
        </Alias>
      </Identity>
      <Feature FeatureTypeID="8"><DatePeriod><Start><From><Year>1960</Year><Month>3</Month><Day>15</Day></From></Start></DatePeriod></Feature>
      <Feature FeatureTypeID="224"><VersionDetail DetailTypeID="1">Male</VersionDetail></Feature>
    </Profile>
  </DistinctParty>
  <DistinctParty FixedRef="9000">
    <Profile ID="9000" PartySubTypeID="4">
      <Identity ID="9001" Primary="true">
        <Alias AliasTypeID="1403" Primary="true" LowQuality="false">
          <DocumentedName ID="9001"><DocumentedNamePart><NamePartValue ScriptID="215">ACME TRADING</NamePartValue></DocumentedNamePart></DocumentedName>
        </Alias>
      </Identity>
    </Profile>
  </DistinctParty>
</DistinctParties>
<ProfileRelationships>
  <ProfileRelationship ID="1" SanctionsEntryID="100" From-ProfileID="2674" To-ProfileID="9000" Former="false"></ProfileRelationship>
</ProfileRelationships>
<SanctionsEntries>
  <SanctionsEntry ID="100" ProfileID="2674">
    <EntryEvent LegalBasisID="1"><Date><Year>2020</Year><Month>1</Month><Day>10</Day></Date></EntryEvent>
    <SanctionsMeasure ID="1"><Comment>SDGT</Comment></SanctionsMeasure>
  </SanctionsEntry>
  <SanctionsEntry ID="101" ProfileID="9000">
    <EntryEvent LegalBasisID="1"><Date><Year>2021</Year><Month>6</Month><Day>1</Day></Date></EntryEvent>
  </SanctionsEntry>
</SanctionsEntries>
</Sanctions>
`;

function streamParse(xml: string, chunkSize: number): { records: SanctionsRecord[]; report: ReturnType<OfacStreamParser["finish"]>["report"] } {
  const parser = new OfacStreamParser();
  const records: SanctionsRecord[] = [];
  for (let i = 0; i < xml.length; i += chunkSize) {
    records.push(...parser.feed(xml.slice(i, i + chunkSize)));
  }
  const tail = parser.finish();
  records.push(...tail.records);
  return { records, report: tail.report };
}

describe("OfacStreamParser", () => {
  const expected = parseOfac(DOC);

  for (const chunkSize of [7, 4096, DOC.length]) {
    it(`matches the in-memory parser with ${chunkSize}-byte chunks`, () => {
      const { records, report } = streamParse(DOC, chunkSize);
      expect(records).toEqual(expected.records);
      expect(report.totalParties).toBe(expected.report.totalParties);
      expect(report.totalEntries).toBe(expected.report.totalEntries);
    });
  }

  it("rejects truncated documents", () => {
    const parser = new OfacStreamParser();
    parser.feed(DOC.slice(0, DOC.length - 30));
    expect(() => parser.finish()).toThrow(/truncated/);
  });

  it("rejects non-OFAC documents", () => {
    const parser = new OfacStreamParser();
    parser.feed("<html><body>nope</body></html>");
    expect(() => parser.finish()).toThrow(/<Sanctions>/);
  });
});

describe("StreamingSha256", () => {
  it("matches the well-known vector for 'abc'", () => {
    const h = new StreamingSha256();
    h.update(new TextEncoder().encode("abc"));
    expect(h.digestHex()).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("matches Web Crypto on multi-chunk input", async () => {
    const chunks = ["<Sanctions>", "x".repeat(100000), "</Sanctions>"].map((s) => new TextEncoder().encode(s));
    const h = new StreamingSha256();
    for (const c of chunks) h.update(c);
    const total = chunks.reduce((n, c) => n + c.byteLength, 0);
    const whole = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { whole.set(c, off); off += c.byteLength; }
    const digest = await crypto.subtle.digest("SHA-256", whole.buffer as ArrayBuffer);
    const expectedHex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(h.digestHex()).toBe(expectedHex);
  });

  it("continues from a serialized checkpoint", () => {
    const first = new TextEncoder().encode("checkpoint-");
    const second = new TextEncoder().encode("safe");
    const original = new StreamingSha256();
    original.update(first);
    const resumed = StreamingSha256.restore(original.checkpoint());
    resumed.update(second);
    const uninterrupted = new StreamingSha256();
    uninterrupted.update(new TextEncoder().encode("checkpoint-safe"));
    expect(resumed.digestHex()).toBe(uninterrupted.digestHex());
  });
});

describe("OFAC parser checkpoints", () => {
  it("retains a block split across separate worker slices", () => {
    let state: OfacCheckpoint = { buffer: "", sawRoot: false, rootClosed: false, section: null };
    const split = DOC.indexOf("ABBAS") + 2;
    const first = consumeOfacChunk(state, DOC.slice(0, split));
    state = first.state;
    const second = consumeOfacChunk(state, DOC.slice(split));
    finishOfacCheckpoint(second.state);
    const entries = [...first.blocks, ...second.blocks].filter((block) => block.kind === "child" && block.section === "SanctionsEntries");
    expect(entries).toHaveLength(2);
  });
});
