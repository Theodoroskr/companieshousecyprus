import { describe, expect, it } from "vitest";
import { parseOfac } from "@/lib/sanctions/parse-ofac";

// Compact but structurally faithful OFAC Advanced XML v3 fixture.
const REFSETS = `<ReferenceValueSets>
  <AliasTypeValues><AliasType ID="1400">A.K.A.</AliasType><AliasType ID="1401">F.K.A.</AliasType><AliasType ID="1402">N.K.A.</AliasType><AliasType ID="1403">Name</AliasType></AliasTypeValues>
  <FeatureTypeValues>
    <FeatureType ID="1">Call Sign</FeatureType><FeatureType ID="2">Vessel Type</FeatureType><FeatureType ID="3">Vessel Flag</FeatureType>
    <FeatureType ID="4">Vessel Owner</FeatureType><FeatureType ID="5">Tonnage</FeatureType><FeatureType ID="6">Gross Registered Tonnage</FeatureType>
    <FeatureType ID="8">Birthdate</FeatureType><FeatureType ID="9">Place of Birth</FeatureType><FeatureType ID="10">Nationality</FeatureType>
    <FeatureType ID="11">Citizenship</FeatureType><FeatureType ID="21">Email Address</FeatureType><FeatureType ID="25">Location</FeatureType>
    <FeatureType ID="26">Title</FeatureType><FeatureType ID="64">Aircraft Tail Number</FeatureType><FeatureType ID="224">Gender</FeatureType>
    <FeatureType ID="344">Digital Currency Address - XBT</FeatureType><FeatureType ID="345">Digital Currency Address - ETH</FeatureType>
  </FeatureTypeValues>
  <DetailReferenceValues><DetailReference ID="92084">section 1(b) of Executive Order 13224</DetailReference></DetailReferenceValues>
  <IDRegDocTypeValues><IDRegDocType ID="1571">Passport</IDRegDocType><IDRegDocType ID="1626">Vessel Registration Identification</IDRegDocType><IDRegDocType ID="91264">MMSI</IDRegDocType></IDRegDocTypeValues>
  <LocPartTypeValues><LocPartType ID="1451">ADDRESS1</LocPartType><LocPartType ID="1452">ADDRESS2</LocPartType><LocPartType ID="1454">CITY</LocPartType></LocPartTypeValues>
  <CountryValues><Country ID="11143">Iraq</Country><Country ID="22222">Cuba</Country><Country ID="33333">Russia</Country></CountryValues>
  <LegalBasisValues><LegalBasis ID="1">Executive Order 13224</LegalBasis></LegalBasisValues>
</ReferenceValueSets>`;

const LOCATIONS = `<Locations>
  <Location ID="25"><LocationCountry CountryID="11143" CountryRelevanceID="1413" /></Location>
  <Location ID="26">
    <LocationPart LocPartTypeID="1451"><LocationPartValue Primary="true" LocPartValueTypeID="1" LocPartValueStatusID="1"><Value>Calle 5 No. 10</Value></LocationPartValue></LocationPart>
    <LocationPart LocPartTypeID="1454"><LocationPartValue Primary="true" LocPartValueTypeID="1" LocPartValueStatusID="1"><Value>Havana</Value></LocationPartValue></LocationPart>
    <LocationCountry CountryID="22222" CountryRelevanceID="1413" />
  </Location>
</Locations>`;

const IDREG = `<IDRegDocuments>
  <IDRegDocument ID="2" IDRegDocTypeID="1571" IdentityID="6746" IssuedBy-CountryID="11143" ValidityID="2">
    <Comment />
    <IDRegistrationNo>040070827</IDRegistrationNo>
    <IssuingAuthority />
  </IDRegDocument>
  <IDRegDocument ID="9" IDRegDocTypeID="1626" IdentityID="1663" IssuedBy-CountryID="22222" ValidityID="2">
    <Comment>IMO 8321785</Comment>
    <IDRegistrationNo>IMO 8321785</IDRegistrationNo>
    <IssuingAuthority />
  </IDRegDocument>
  <IDRegDocument ID="10" IDRegDocTypeID="91264" IdentityID="1663" IssuedBy-CountryID="22222" ValidityID="2">
    <Comment />
    <IDRegistrationNo>323456789</IDRegistrationNo>
    <IssuingAuthority />
  </IDRegDocument>
</IDRegDocuments>`;

const PERSON_PARTY = `<DistinctParty FixedRef="2674">
  <Profile ID="2674" PartySubTypeID="4">
    <Identity ID="6746" FixedRef="2674" Primary="true" False="false">
      <Alias FixedRef="2674" AliasTypeID="1403" Primary="true" LowQuality="false">
        <DocumentedName ID="6746" FixedRef="2674" DocNameStatusID="1">
          <DocumentedNamePart><NamePartValue NamePartGroupID="71642" ScriptID="215" ScriptStatusID="1" Acronym="false">ABBAS</NamePartValue></DocumentedNamePart>
          <DocumentedNamePart><NamePartValue NamePartGroupID="71643" ScriptID="215" ScriptStatusID="1" Acronym="false">Abu</NamePartValue></DocumentedNamePart>
        </DocumentedName>
        <DocumentedName ID="6747" FixedRef="2674" DocNameStatusID="2">
          <DocumentedNamePart><NamePartValue NamePartGroupID="71644" ScriptID="160" ScriptStatusID="1" Acronym="false">عباس</NamePartValue></DocumentedNamePart>
        </DocumentedName>
      </Alias>
      <Alias FixedRef="2674" AliasTypeID="1400" Primary="false" LowQuality="false">
        <DocumentedName ID="13218" FixedRef="2674" DocNameStatusID="2">
          <DocumentedNamePart><NamePartValue NamePartGroupID="19443" ScriptID="215" ScriptStatusID="1" Acronym="false">ZAYDAN</NamePartValue></DocumentedNamePart>
        </DocumentedName>
      </Alias>
      <Alias FixedRef="2674" AliasTypeID="1401" Primary="false" LowQuality="true">
        <DocumentedName ID="13219" FixedRef="2674" DocNameStatusID="2">
          <DocumentedNamePart><NamePartValue NamePartGroupID="19445" ScriptID="215" ScriptStatusID="1" Acronym="false">ABU ABBAS FACTION</NamePartValue></DocumentedNamePart>
        </DocumentedName>
      </Alias>
      <NamePartGroups>
        <MasterNamePartGroup><NamePartGroup ID="71642" NamePartTypeID="1520" /></MasterNamePartGroup>
        <MasterNamePartGroup><NamePartGroup ID="71643" NamePartTypeID="1521" /></MasterNamePartGroup>
      </NamePartGroups>
    </Identity>
    <Feature ID="1000" FeatureTypeID="8">
      <FeatureVersion ID="3550" ReliabilityID="1">
        <Comment />
        <DatePeriod CalendarTypeID="1"><Start><From><Year>1948</Year><Month>12</Month><Day>10</Day></From></Start></DatePeriod>
      </FeatureVersion>
    </Feature>
    <Feature ID="1001" FeatureTypeID="9">
      <FeatureVersion ID="3551" ReliabilityID="1"><Comment /><VersionLocation LocationID="25" /></FeatureVersion>
    </Feature>
    <Feature ID="1002" FeatureTypeID="10">
      <FeatureVersion ID="3552" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1433" /><VersionLocation LocationID="25" /></FeatureVersion>
    </Feature>
    <Feature ID="1003" FeatureTypeID="26">
      <FeatureVersion ID="3553" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1432">Director of PLF</VersionDetail></FeatureVersion>
    </Feature>
    <Feature ID="1004" FeatureTypeID="344">
      <FeatureVersion ID="3554" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1432">12aNKp2iDKuhEde2YfPdd4DFGenRUTKupL</VersionDetail></FeatureVersion>
    </Feature>
  </Profile>
</DistinctParty>`;

const VESSEL_PARTY = `<DistinctParty FixedRef="4238">
  <Profile ID="4238" PartySubTypeID="1">
    <Identity ID="1663" FixedRef="4238" Primary="true" False="false">
      <Alias FixedRef="4238" AliasTypeID="1403" Primary="true" LowQuality="false">
        <DocumentedName ID="1663" FixedRef="4238" DocNameStatusID="1">
          <DocumentedNamePart><NamePartValue NamePartGroupID="2489" ScriptID="215" ScriptStatusID="1" Acronym="false">MAR AZUL</NamePartValue></DocumentedNamePart>
        </DocumentedName>
      </Alias>
      <NamePartGroups><MasterNamePartGroup><NamePartGroup ID="2489" NamePartTypeID="1526" /></MasterNamePartGroup></NamePartGroups>
    </Identity>
    <Feature ID="10272" FeatureTypeID="1">
      <FeatureVersion ID="7125" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1432">CL2192</VersionDetail></FeatureVersion>
    </Feature>
    <Feature ID="10321" FeatureTypeID="3">
      <FeatureVersion ID="7174" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1432">Cuba</VersionDetail></FeatureVersion>
    </Feature>
    <Feature ID="10515" FeatureTypeID="4">
      <FeatureVersion ID="7368" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1432">Samir de Navegacion S.A.</VersionDetail></FeatureVersion>
    </Feature>
    <Feature ID="11080" FeatureTypeID="2">
      <FeatureVersion ID="7933" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1431" DetailReferenceID="92084" /></FeatureVersion>
    </Feature>
    <Feature ID="152237" FeatureTypeID="25">
      <FeatureVersion ID="202237" ReliabilityID="1"><Comment /><VersionLocation LocationID="26" /></FeatureVersion>
    </Feature>
  </Profile>
</DistinctParty>`;

const AIRCRAFT_PARTY = `<DistinctParty FixedRef="5001">
  <Profile ID="5001" PartySubTypeID="2">
    <Identity ID="9001" FixedRef="5001" Primary="true" False="false">
      <Alias FixedRef="5001" AliasTypeID="1403" Primary="true" LowQuality="false">
        <DocumentedName ID="9001" FixedRef="5001" DocNameStatusID="1">
          <DocumentedNamePart><NamePartValue NamePartGroupID="9001" ScriptID="215" ScriptStatusID="1" Acronym="false">EP-GOL</NamePartValue></DocumentedNamePart>
        </DocumentedName>
      </Alias>
    </Identity>
    <Feature ID="2001" FeatureTypeID="64">
      <FeatureVersion ID="2001" ReliabilityID="1"><Comment /><VersionDetail DetailTypeID="1432">EP-GOL</VersionDetail></FeatureVersion>
    </Feature>
  </Profile>
</DistinctParty>`;

const ENTITY_PARTY = `<DistinctParty FixedRef="36">
  <Profile ID="36" PartySubTypeID="3">
    <Identity ID="4375" FixedRef="36" Primary="true" False="false">
      <Alias FixedRef="36" AliasTypeID="1403" Primary="true" LowQuality="false">
        <DocumentedName ID="4375" FixedRef="36" DocNameStatusID="1">
          <DocumentedNamePart><NamePartValue NamePartGroupID="6700" ScriptID="215" ScriptStatusID="1" Acronym="false">AEROCARIBBEAN AIRLINES</NamePartValue></DocumentedNamePart>
        </DocumentedName>
      </Alias>
      <NamePartGroups><MasterNamePartGroup><NamePartGroup ID="6700" NamePartTypeID="1525" /></MasterNamePartGroup></NamePartGroups>
    </Identity>
    <Feature ID="150025" FeatureTypeID="25">
      <FeatureVersion ID="200025" ReliabilityID="1"><Comment /><VersionLocation LocationID="25" /></FeatureVersion>
    </Feature>
  </Profile>
</DistinctParty>`;

const RELATIONSHIPS = `<ProfileRelationships>
  <ProfileRelationship ID="1" From-ProfileID="2674" To-ProfileID="36" RelationTypeID="15003" RelationQualityID="1" Former="false" SanctionsEntryID="2674"><Comment /></ProfileRelationship>
</ProfileRelationships>`;

function entry(id: string, profileId: string, comment = "SDGT"): string {
  return `<SanctionsEntry ID="${id}" ProfileID="${profileId}" ListID="1550">
    <EntryEvent ID="${id}" EntryEventTypeID="1" LegalBasisID="1">
      <Comment />
      <Date CalendarTypeID="1"><Year>2001</Year><Month>12</Month><Day>4</Day></Date>
    </EntryEvent>
    <SanctionsMeasure ID="${id}1" SanctionsTypeID="1"><Comment>${comment}</Comment></SanctionsMeasure>
  </SanctionsEntry>`;
}

function doc(entriesXml: string, parties = [PERSON_PARTY, VESSEL_PARTY, AIRCRAFT_PARTY, ENTITY_PARTY]): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Sanctions Version="3">
${REFSETS}
${LOCATIONS}
${IDREG}
<DistinctParties>${parties.join("\n")}</DistinctParties>
${RELATIONSHIPS}
<SanctionsEntries>${entriesXml}</SanctionsEntries>
</Sanctions>`;
}

describe("parseOfac", () => {
  const allEntries = [entry("2674", "2674"), entry("4238", "4238", "CUBA"), entry("5001", "5001", "IRAN"), entry("36", "36", "CUBA")].join("\n");

  it("parses all four entity types from the fixture", () => {
    const { records, report } = parseOfac(doc(allEntries));
    expect(records).toHaveLength(4);
    expect(report.partyTypeCounts).toEqual({ person: 1, ship: 1, aircraft: 1, entity: 1 });
  });

  it("extracts person details, original script name, and passport", () => {
    const { records } = parseOfac(doc(allEntries));
    const person = records.find((r) => r.source_record_id === "2674")!;
    expect(person.entity_type).toBe("person");
    expect(person.primary_name).toBe("ABBAS Abu");
    expect(person.name_original_script).toBe("عباس");
    expect(person.designation_date).toBe("2001-12-04");
    expect(person.person?.date_of_birth).toEqual([{ date: "1948-12-10", approximate: true }]);
    expect(person.person?.nationalities).toEqual(["Iraq"]);
    expect(person.person?.titles).toEqual(["Director of PLF"]);
    const passport = person.identifiers.find((i) => i.identifier_type === "Passport");
    expect(passport?.identifier_value).toBe("040070827");
    expect(passport?.issuing_country).toBe("Iraq");
  });

  it("classifies strong, former, and weak aliases correctly", () => {
    const { records } = parseOfac(doc(allEntries));
    const person = records.find((r) => r.source_record_id === "2674")!;
    const types = Object.fromEntries(person.aliases.map((a) => [a.alias_name, a.alias_type]));
    expect(types["ABBAS Abu"]).toBe("primary");
    expect(types["ZAYDAN"]).toBe("alias");
    expect(types["ABU ABBAS FACTION"]).toBe("weak"); // LowQuality wins over F.K.A.
  });

  it("maps digital currency addresses with wallet type", () => {
    const { records } = parseOfac(doc(allEntries));
    const person = records.find((r) => r.source_record_id === "2674")!;
    const wallet = person.identifiers.find((i) => i.identifier_type === "digital_currency_address");
    expect(wallet?.identifier_value).toBe("XBT:12aNKp2iDKuhEde2YfPdd4DFGenRUTKupL");
    expect(person.raw["wallets"]).toEqual([{ currency: "XBT", address: "12aNKp2iDKuhEde2YfPdd4DFGenRUTKupL" }]);
  });

  it("extracts vessel details, IMO registration, MMSI, and address", () => {
    const { records } = parseOfac(doc(allEntries));
    const ship = records.find((r) => r.source_record_id === "4238")!;
    expect(ship.entity_type).toBe("ship");
    expect(ship.raw["vessel"]).toMatchObject({ callSign: "CL2192", flag: "Cuba", owner: "Samir de Navegacion S.A." });
    const imo = ship.identifiers.find((i) => i.identifier_type === "Vessel Registration Identification");
    expect(imo?.identifier_value).toContain("IMO 8321785");
    const mmsi = ship.identifiers.find((i) => i.identifier_type === "MMSI");
    expect(mmsi?.identifier_value).toBe("323456789");
    expect(ship.addresses[0]?.full_address).toContain("Havana");
    expect(ship.addresses[0]?.country).toBe("Cuba");
  });

  it("extracts aircraft tail number without classifying it as an entity", () => {
    const { records } = parseOfac(doc(allEntries));
    const air = records.find((r) => r.source_record_id === "5001")!;
    expect(air.entity_type).toBe("aircraft");
    expect(air.raw["aircraft"]).toMatchObject({ tailNumber: "EP-GOL" });
    expect(air.identifiers.some((i) => i.identifier_type === "aircraft_tail_number")).toBe(true);
  });

  it("resolves programmes, legal basis, and relationships", () => {
    const { records } = parseOfac(doc(allEntries));
    const person = records.find((r) => r.source_record_id === "2674")!;
    expect(person.sanctions_programme).toBe("SDGT");
    expect(person.legal_basis).toBe("Executive Order 13224");
    expect(person.relationships).toEqual([
      { related_source_record_id: "36", related_name: "AEROCARIBBEAN AIRLINES", relationship_type: "associated", source_description: null },
    ]);
  });

  it("keeps unique entry IDs and reports duplicates", () => {
    const dup = [entry("2674", "2674"), entry("2674", "2674")].join("\n");
    const { records, report } = parseOfac(doc(dup));
    expect(records).toHaveLength(1);
    expect(report.duplicateEntryIds).toBe(1);
  });

  it("throws on malformed XML (missing root)", () => {
    expect(() => parseOfac("<html>nope</html>")).toThrow(/<Sanctions>/);
  });

  it("throws on truncated documents (missing closing tag)", () => {
    expect(() => parseOfac(doc(allEntries).replace("</Sanctions>", ""))).toThrow(/truncated/);
  });

  it("skips entries whose party has no identity", () => {
    const orphan = entry("9999", "9999");
    const { records, report } = parseOfac(doc(orphan));
    expect(records.find((r) => r.source_record_id === "9999")).toBeUndefined();
    expect(report.skippedNoIdentity).toBe(1);
  });

  it("does not emit person details for non-person records", () => {
    const { records } = parseOfac(doc(allEntries));
    const entity = records.find((r) => r.source_record_id === "36")!;
    expect(entity.entity_type).toBe("entity");
    expect(entity.person).toBeUndefined();
  });
});
