import { describe, expect, it } from "vitest";
import {
  committeeForReference,
  iterateUnRecords,
  looksLikeUnConsolidated,
} from "@/lib/sanctions/parse-un";

const SAMPLE_INDIVIDUAL = `
<INDIVIDUAL>
<DATAID>6908435</DATAID><VERSIONNUM>1</VERSIONNUM>
<FIRST_NAME>SAYF</FIRST_NAME><SECOND_NAME>AL ADL</SECOND_NAME>
<UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE>
<REFERENCE_NUMBER>QDi.001</REFERENCE_NUMBER>
<LISTED_ON>2001-01-25</LISTED_ON>
<COMMENTS1>Responsible for attacks.</COMMENTS1>
<NAME_ORIGINAL_SCRIPT>سيف العدل</NAME_ORIGINAL_SCRIPT>
<TITLE><VALUE>Emir</VALUE></TITLE>
<DESIGNATION><VALUE>Leader</VALUE></DESIGNATION>
<NATIONALITY><VALUE>Egypt</VALUE></NATIONALITY>
<LIST_TYPE><VALUE>UN List</VALUE></LIST_TYPE>
<LAST_UPDATED><VALUE>2011-10-21</VALUE><VALUE>2023-04-04</VALUE></LAST_UPDATED>
<INDIVIDUAL_ALIAS><QUALITY>Good</QUALITY><ALIAS_NAME>Muhamad Makkawi</ALIAS_NAME></INDIVIDUAL_ALIAS>
<INDIVIDUAL_ALIAS><QUALITY>Low</QUALITY><ALIAS_NAME>The Teacher</ALIAS_NAME></INDIVIDUAL_ALIAS>
<INDIVIDUAL_ALIAS><QUALITY>Good</QUALITY><ALIAS_NAME>Old Org</ALIAS_NAME><NOTE>f.k.a. Old Org</NOTE></INDIVIDUAL_ALIAS>
<INDIVIDUAL_ADDRESS><STREET>1 Main St</STREET><CITY>Cairo</CITY><COUNTRY>Egypt</COUNTRY></INDIVIDUAL_ADDRESS>
<INDIVIDUAL_ADDRESS><CITY>Peshawar</CITY><STATE_PROVINCE>Khyber Pakhtunkhwa</STATE_PROVINCE><COUNTRY>Pakistan</COUNTRY></INDIVIDUAL_ADDRESS>
<INDIVIDUAL_DATE_OF_BIRTH><TYPE_OF_DATE>EXACT</TYPE_OF_DATE><DATE>1963-04-11</DATE></INDIVIDUAL_DATE_OF_BIRTH>
<INDIVIDUAL_DATE_OF_BIRTH><TYPE_OF_DATE>APPROXIMATELY</TYPE_OF_DATE><YEAR>1960</YEAR></INDIVIDUAL_DATE_OF_BIRTH>
<INDIVIDUAL_PLACE_OF_BIRTH><CITY>Monufia</CITY><COUNTRY>Egypt</COUNTRY></INDIVIDUAL_PLACE_OF_BIRTH>
<INDIVIDUAL_DOCUMENT><TYPE_OF_DOCUMENT>Passport</TYPE_OF_DOCUMENT><NUMBER>1234567</NUMBER><ISSUING_COUNTRY>Egypt</ISSUING_COUNTRY><DATE_OF_ISSUE>2010-01-01</DATE_OF_ISSUE></INDIVIDUAL_DOCUMENT>
<INDIVIDUAL_DOCUMENT><TYPE_OF_DOCUMENT>National identification number</TYPE_OF_DOCUMENT><NUMBER>998877</NUMBER></INDIVIDUAL_DOCUMENT>
<GENDER>Male</GENDER>
</INDIVIDUAL>`;

const SAMPLE_ENTITY = `
<ENTITY>
<DATAID>6908444</DATAID><VERSIONNUM>2</VERSIONNUM>
<FIRST_NAME>AL QAIDA</FIRST_NAME>
<UN_LIST_TYPE>Al-Qaida</UN_LIST_TYPE>
<REFERENCE_NUMBER>QDe.004</REFERENCE_NUMBER>
<LISTED_ON>2001-10-06</LISTED_ON>
<COMMENTS1>Terror network.</COMMENTS1>
<LAST_UPDATED><VALUE>2024-01-15</VALUE></LAST_UPDATED>
<ENTITY_ALIAS><QUALITY>Good</QUALITY><ALIAS_NAME>Al Qaeda</ALIAS_NAME></ENTITY_ALIAS>
<ENTITY_ALIAS><QUALITY>Low</QUALITY><ALIAS_NAME>The Base</ALIAS_NAME></ENTITY_ALIAS>
<ENTITY_ADDRESS><CITY>Kabul</CITY><COUNTRY>Afghanistan</COUNTRY></ENTITY_ADDRESS>
</ENTITY>`;

const DOC = `<?xml version="1.0" encoding="UTF-8"?>
<CONSOLIDATED_LIST dateGenerated="2026-08-26">
<INDIVIDUALS>${SAMPLE_INDIVIDUAL}</INDIVIDUALS>
<ENTITIES>${SAMPLE_ENTITY}</ENTITIES>
</CONSOLIDATED_LIST>`;

describe("looksLikeUnConsolidated", () => {
  it("accepts a well-formed document", () => {
    expect(looksLikeUnConsolidated(DOC).ok).toBe(true);
  });
  it("rejects an HTML error page", () => {
    expect(looksLikeUnConsolidated("<html><body>404</body></html>").ok).toBe(false);
  });
  it("rejects malformed / non-XML content", () => {
    expect(looksLikeUnConsolidated("not xml at all").ok).toBe(false);
  });
  it("rejects a truncated document", () => {
    expect(looksLikeUnConsolidated(DOC.replace("</CONSOLIDATED_LIST>", "")).ok).toBe(false);
  });
  it("rejects XML without recognisable UN fields", () => {
    expect(
      looksLikeUnConsolidated('<?xml version="1.0"?><CONSOLIDATED_LIST><X/></CONSOLIDATED_LIST>').ok,
    ).toBe(false);
  });
});

describe("UN individual parsing", () => {
  const [person] = [...iterateUnRecords(DOC)];

  it("uses the permanent reference number as the id", () => {
    expect(person!.source_record_id).toBe("QDi.001");
    expect(person!.entity_type).toBe("person");
  });
  it("builds the normalised full name from name parts", () => {
    expect(person!.primary_name).toBe("SAYF AL ADL");
    expect(person!.primary_name_normalized).toBe("SAYF AL ADL");
  });
  it("captures the original-script name", () => {
    expect(person!.name_original_script).toBe("سيف العدل");
    expect(person!.aliases.some((a) => a.alias_type === "original script")).toBe(true);
  });
  it("distinguishes good and low quality aliases and former names", () => {
    expect(person!.aliases.some((a) => a.alias_type === "good alias" && a.alias_name === "Muhamad Makkawi")).toBe(true);
    expect(person!.aliases.some((a) => a.alias_type === "low alias" && a.alias_name === "The Teacher")).toBe(true);
    expect(person!.aliases.some((a) => a.alias_type === "former name")).toBe(true);
  });
  it("derives the sanctions committee from the reference number", () => {
    expect(person!.sanctions_programme).toContain("Al-Qaida");
  });
  it("captures listing and latest amendment dates", () => {
    expect(person!.designation_date).toBe("2001-01-25");
    expect(person!.last_amended_date).toBe("2023-04-04");
  });
  it("captures multiple dates and places of birth", () => {
    expect(person!.person!.date_of_birth).toHaveLength(2);
    expect(person!.person!.date_of_birth[0]).toMatchObject({ date: "1963-04-11", circa: false });
    expect(person!.person!.date_of_birth[1]).toMatchObject({ year: "1960", circa: true });
    expect(person!.person!.place_of_birth[0]).toMatchObject({ city: "Monufia", country: "Egypt" });
  });
  it("captures multiple addresses", () => {
    expect(person!.addresses).toHaveLength(2);
    expect(person!.addresses[1]).toMatchObject({ city: "Peshawar", country: "Pakistan" });
  });
  it("captures passports and national IDs as identifiers", () => {
    expect(person!.identifiers.some((i) => i.identifier_type === "passport" && i.identifier_value === "1234567")).toBe(true);
    expect(person!.identifiers.some((i) => i.identifier_type === "national id" && i.identifier_value === "998877")).toBe(true);
  });
  it("captures title, designation, nationality and gender", () => {
    expect(person!.person!.titles).toContain("Emir");
    expect(person!.person!.nationalities).toContain("Egypt");
    expect(person!.person!.gender).toBe("Male");
    expect((person!.raw as { designations: string[] }).designations).toContain("Leader");
  });
});

describe("UN entity parsing", () => {
  const [, entity] = [...iterateUnRecords(DOC)];

  it("parses the entity with its reference number", () => {
    expect(entity!.source_record_id).toBe("QDe.004");
    expect(entity!.entity_type).toBe("entity");
    expect(entity!.primary_name).toBe("AL QAIDA");
  });
  it("parses entity aliases with quality", () => {
    expect(entity!.aliases.some((a) => a.alias_type === "good alias" && a.alias_name === "Al Qaeda")).toBe(true);
    expect(entity!.aliases.some((a) => a.alias_type === "low alias" && a.alias_name === "The Base")).toBe(true);
  });
  it("parses entity addresses and dates", () => {
    expect(entity!.addresses[0]).toMatchObject({ city: "Kabul", country: "Afghanistan" });
    expect(entity!.designation_date).toBe("2001-10-06");
    expect(entity!.last_amended_date).toBe("2024-01-15");
  });
});

describe("committeeForReference", () => {
  it("maps known prefixes", () => {
    expect(committeeForReference("KPi.001")).toContain("1718");
    expect(committeeForReference("TAi.001")).toContain("1988");
  });
  it("falls back to the list type for unknown prefixes", () => {
    expect(committeeForReference("ZZi.001", "Taliban")).toBe("UN Taliban sanctions regime");
  });
});
