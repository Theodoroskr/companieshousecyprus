import { describe, expect, it } from "vitest";
import { iterateUkDesignations, looksLikeUkSanctionsList, parseDesignation } from "./parse-uk";

// Real fragments from the UK Sanctions List (26 Aug 2026 snapshot), trimmed.
const INDIVIDUAL = `<Designation>
  <LastUpdated>14/04/2026</LastUpdated>
  <DateDesignated>25/01/2001</DateDesignated>
  <UniqueID>AFG0006</UniqueID>
  <OFSIGroupID>7172</OFSIGroupID>
  <UNReferenceNumber>TAi.002</UNReferenceNumber>
  <Names>
    <Name><Name1>MOHAMMAD</Name1><Name2>HASSAN</Name2><Name6>AKHUND</Name6><NameType>Primary Name</NameType></Name>
    <Name><Name1>Mohammad</Name1><Name2>Hassan</Name2><Name6>Akhund</Name6><NameType>Primary name variation</NameType></Name>
    <Name><Name6>Haji Mohammad Hassan</Name6><NameType>Alias</NameType><AliasStrength>Good quality a.k.a</AliasStrength></Name>
  </Names>
  <NonLatinNames><NonLatinName><NameNonLatinScript>محمد حسن آخوند</NameNonLatinScript></NonLatinName></NonLatinNames>
  <Titles><Title>Mullah</Title><Title>Haji</Title></Titles>
  <RegimeName>The Afghanistan (Sanctions) (EU Exit) Regulations 2020</RegimeName>
  <IndividualEntityShip>Individual</IndividualEntityShip>
  <DesignationSource>UN</DesignationSource>
  <SanctionsImposed>Asset freeze|Travel Ban</SanctionsImposed>
  <OtherInformation>A close associate of Mullah Mohammed Omar.</OtherInformation>
  <UKStatementofReasons>Deputy Minister of Civil Aviation under the Taliban regime.</UKStatementofReasons>
  <Addresses><Address><AddressLine6>Kabul</AddressLine6><AddressCountry>Afghanistan</AddressCountry></Address></Addresses>
  <IndividualDetails>
    <Individual>
      <DOBs><DOB>dd/mm/1945</DOB><DOB>dd/mm/1946</DOB><DOB>01/03/1958</DOB></DOBs>
      <PassportDetails>
        <Passport><PassportNumber>P04581926</PassportNumber><PassportAdditionalInformation>Afghanistan passport</PassportAdditionalInformation></Passport>
        <Passport><PassportNumber>P04581926</PassportNumber><PassportAdditionalInformation>duplicate row</PassportAdditionalInformation></Passport>
      </PassportDetails>
      <NationalIdentifierDetails><NationalIdentifier><NationalIdentifierNumber>12345</NationalIdentifierNumber></NationalIdentifier></NationalIdentifierDetails>
      <Nationalities><Nationality>Afghanistan</Nationality></Nationalities>
      <Positions><Position>Deputy Minister of Civil Aviation under the Taliban</Position></Positions>
      <Genders><Gender>Male</Gender></Genders>
      <BirthDetails>
        <Location><TownOfBirth>Lakhi village</TownOfBirth><CountryOfBirth>Afghanistan</CountryOfBirth></Location>
        <Location><TownOfBirth>Darvishan</TownOfBirth><CountryOfBirth>Afghanistan</CountryOfBirth></Location>
      </BirthDetails>
    </Individual>
  </IndividualDetails>
</Designation>`;

const ENTITY = `<Designation>
  <LastUpdated>04/08/2026</LastUpdated>
  <DateDesignated>29/06/2012</DateDesignated>
  <UniqueID>AFG0001</UniqueID>
  <OFSIGroupID>12703</OFSIGroupID>
  <Names>
    <Name><Name6>HAJI KHAIRULLAH HAJI SATTAR MONEY EXCHANGE</Name6><NameType>Primary Name</NameType></Name>
    <Name><Name6>Haji Alim Hawala</Name6><NameType>Alias</NameType><AliasStrength>Good quality a.k.a</AliasStrength></Name>
    <Name><Name6>Haji Hakim Hawala</Name6><NameType>ALias</NameType><AliasStrength>Low quality a.k.a</AliasStrength></Name>
  </Names>
  <NonLatinNames><NonLatinName><NameNonLatinScript>حاجی خيرالله و حاجی ستار صرافی</NameNonLatinScript></NonLatinName></NonLatinNames>
  <RegimeName>The Afghanistan (Sanctions) (EU Exit) Regulations 2020</RegimeName>
  <IndividualEntityShip>Entity</IndividualEntityShip>
  <DesignationSource>UN</DesignationSource>
  <SanctionsImposed>Asset freeze</SanctionsImposed>
  <UKStatementofReasons>Involved in the financing of the Taliban.</UKStatementofReasons>
  <Addresses>
    <Address><AddressLine1>Branch Office 1</AddressLine1><AddressLine6>Kabul</AddressLine6><AddressPostalCode>1001</AddressPostalCode><AddressCountry>Afghanistan</AddressCountry></Address>
  </Addresses>
  <EntityDetails>
    <Entity>
      <TypeOfEntities><TypeOfEntity>Terrorist organisation</TypeOfEntity></TypeOfEntities>
      <BusinessRegistrationNumbers><BusinessRegistrationNumber>BR-99-XY</BusinessRegistrationNumber></BusinessRegistrationNumbers>
      <ParentCompanies><ParentCompany>HKHS Holding</ParentCompany></ParentCompanies>
      <Subsidiaries><Subsidiary>Kandahar Branch</Subsidiary></Subsidiaries>
    </Entity>
  </EntityDetails>
  <PhoneNumbers><PhoneNumber>+93-202-104748</PhoneNumber></PhoneNumbers>
  <EmailAddresses><EmailAddress>helmand_exchange_msp@yahoo.com</EmailAddress></EmailAddresses>
  <Websites><Website>http://example.org</Website></Websites>
</Designation>`;

const SHIP = `<Designation>
  <LastUpdated>18/12/2021</LastUpdated>
  <DateDesignated>03/10/2017</DateDesignated>
  <UniqueID>DPR0075</UniqueID>
  <Names>
    <Name><Name6>Petrel 8</Name6><NameType>Primary name</NameType></Name>
    <Name><Name6>Jal Vahini</Name6><NameType>Alias</NameType></Name>
  </Names>
  <RegimeName>The Democratic People's Republic of Korea (Sanctions) (EU Exit) Regulations 2019</RegimeName>
  <IndividualEntityShip>Ship</IndividualEntityShip>
  <DesignationSource>UN</DesignationSource>
  <SanctionsImposed>Prohibition of port entry</SanctionsImposed>
  <ShipDetails>
    <Ship>
      <IMONumbers><IMONumber>IMO9562233</IMONumber></IMONumbers>
      <CurrentOwnerOperators><CurrentOwnerOperator>Global United Shipping India</CurrentOwnerOperator></CurrentOwnerOperators>
      <CurrentBelievedFlagOfShips><CurrentBelievedFlagOfShip>Comoros</CurrentBelievedFlagOfShip></CurrentBelievedFlagOfShips>
      <PreviousFlags><PreviousFlag>India</PreviousFlag></PreviousFlags>
      <TypeOfShipDetails><TypeOfShip>Bulk Carrier</TypeOfShip></TypeOfShipDetails>
      <TonnageOfShipDetails><TonnageOfShip>7078</TonnageOfShip></TonnageOfShipDetails>
      <YearsBuilt><YearBuilt>2011</YearBuilt></YearsBuilt>
    </Ship>
  </ShipDetails>
</Designation>`;

const WRAPPED = `<?xml version="1.0" encoding="utf-8"?>
<Designations><DateGenerated>20/08/2026</DateGenerated>
${INDIVIDUAL}
${ENTITY}
${SHIP}
</Designations>`;

describe("looksLikeUkSanctionsList", () => {
  it("accepts the UK Sanctions List structure", () => {
    expect(looksLikeUkSanctionsList(WRAPPED).ok).toBe(true);
  });
  it("rejects the former OFSI / other formats", () => {
    expect(looksLikeUkSanctionsList('<CONSOLIDATED_LIST dateGenerated="2020-01-01"/>').ok).toBe(false);
    expect(looksLikeUkSanctionsList("<export><sanctionEntity/></export>").ok).toBe(false);
    expect(looksLikeUkSanctionsList("<html><body>404</body></html>").ok).toBe(false);
    expect(looksLikeUkSanctionsList("").ok).toBe(false);
  });
});

describe("parseDesignation — individual", () => {
  const record = parseDesignation(INDIVIDUAL)!;
  it("uses the UniqueID as the source identifier", () => {
    expect(record.source_record_id).toBe("AFG0006");
    expect(record.entity_type).toBe("person");
  });
  it("builds the primary name from Name1…Name6 components", () => {
    expect(record.primary_name).toBe("MOHAMMAD HASSAN AKHUND");
  });
  it("captures the original-script name", () => {
    expect(record.name_original_script).toBe("محمد حسن آخوند");
  });
  it("maps aliases and primary-name variations with correct types", () => {
    const types = record.aliases.map((a) => a.alias_type);
    expect(types).toContain("alias");
    expect(types).toContain("primary_variation");
    expect(types).toContain("original_script");
  });
  it("parses masked and exact dates of birth", () => {
    const dobs = record.person?.date_of_birth as { date: string; datePrecision: string }[];
    expect(dobs).toHaveLength(3);
    expect(dobs[0]).toMatchObject({ date: "1945-01-01", datePrecision: "year" });
    expect(dobs[2]).toMatchObject({ date: "1958-03-01", datePrecision: "day" });
  });
  it("captures places of birth, nationalities, titles and gender", () => {
    expect(record.person?.place_of_birth).toHaveLength(2);
    expect(record.person?.nationalities).toEqual(["Afghanistan"]);
    expect(record.person?.titles).toEqual(["Mullah", "Haji"]);
    expect(record.person?.gender).toBe("Male");
  });
  it("deduplicates passports and keeps national identifiers", () => {
    const passports = record.identifiers.filter((i) => i.identifier_type === "passport");
    expect(passports).toHaveLength(1);
    expect(passports[0]?.identifier_value).toBe("P04581926");
    expect(record.identifiers.map((i) => i.identifier_type)).toEqual(
      expect.arrayContaining(["passport", "national_id", "ofsi_group_id", "un_ref"]),
    );
  });
  it("parses dd/mm/yyyy designation dates", () => {
    expect(record.designation_date).toBe("2001-01-25");
    expect(record.last_amended_date).toBe("2026-04-14");
  });
  it("captures the regime and statement of reasons", () => {
    expect(record.sanctions_programme).toContain("Afghanistan");
    expect(record.listing_reason).toContain("Deputy Minister");
  });
  it("captures addresses", () => {
    expect(record.addresses[0]).toMatchObject({ country: "Afghanistan" });
    expect(record.addresses[0]?.full_address).toContain("Kabul");
  });
});

describe("parseDesignation — entity", () => {
  const record = parseDesignation(ENTITY)!;
  it("classifies entities and handles the 'ALias' casing quirk", () => {
    expect(record.entity_type).toBe("entity");
    expect(record.aliases.filter((a) => a.alias_type === "alias")).toHaveLength(2);
  });
  it("captures registration numbers, phones, emails and websites", () => {
    expect(record.identifiers.some((i) => i.identifier_type === "registration" && i.identifier_value === "BR-99-XY")).toBe(true);
    expect(record.raw["phone_numbers"]).toEqual(["+93-202-104748"]);
    expect(record.raw["email_addresses"]).toEqual(["helmand_exchange_msp@yahoo.com"]);
    expect(record.raw["websites"]).toEqual(["http://example.org"]);
  });
  it("captures parent companies and subsidiaries as relationships", () => {
    const types = record.relationships.map((r) => r.relationship_type);
    expect(types).toContain("parent_company");
    expect(types).toContain("subsidiary");
  });
  it("has no person details", () => {
    expect(record.person).toBeUndefined();
  });
});

describe("parseDesignation — ship", () => {
  const record = parseDesignation(SHIP)!;
  it("keeps ships as their own record type, never an entity", () => {
    expect(record.entity_type).toBe("ship");
    expect(record.primary_name).toBe("Petrel 8");
  });
  it("captures IMO numbers as identifiers", () => {
    expect(record.identifiers.some((i) => i.identifier_type === "imo" && i.identifier_value === "IMO9562233")).toBe(true);
  });
  it("preserves vessel details and owner/operators", () => {
    const ship = record.raw["ship"] as Record<string, string[]>;
    expect(ship["current_flag"]).toEqual(["Comoros"]);
    expect(ship["previous_flags"]).toEqual(["India"]);
    expect(ship["ship_types"]).toEqual(["Bulk Carrier"]);
    expect(ship["year_built"]).toEqual(["2011"]);
    expect(record.relationships.some((r) => r.relationship_type === "owner_operator")).toBe(true);
  });
});

describe("iterateUkDesignations", () => {
  it("yields every designation in order", () => {
    const records = [...iterateUkDesignations(WRAPPED)];
    expect(records.map((r) => r.source_record_id)).toEqual(["AFG0006", "AFG0001", "DPR0075"]);
    expect(records.map((r) => r.entity_type)).toEqual(["person", "entity", "ship"]);
  });
  it("skips blocks without a UniqueID", () => {
    const broken = WRAPPED.replace("<UniqueID>AFG0001</UniqueID>", "");
    const records = [...iterateUkDesignations(broken)];
    expect(records).toHaveLength(2);
  });
});
