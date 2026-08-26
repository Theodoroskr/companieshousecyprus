import { describe, expect, it } from "vitest";
import { iterateEntities, looksLikeFsf11, normalizeName, recordFingerprint } from "./parse";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<export xmlns="http://eu.europa.ec/fpi/fsd/export">
  <sanctionEntity logicalId="13" euReferenceNumber="EU.27.28" designationDetails="Head of the entity">
    <regulation programme="UKR" numberTitle="269/2014 (OJ L78)" entryIntoForceDate="2014-03-17" publicationDate="2014-03-17"/>
    <subjectType code="person" classificationCode="P"/>
    <nameAlias firstName="Ivan" lastName="Petrov" wholeName="Ivan Petrov" gender="M" title="Mr" nameLanguage="EN" strong="true"/>
    <nameAlias wholeName="Ιωάννης Πέτρου" nameLanguage="EL" strong="false"/>
    <address city="Nicosia" street="1 Main St" zipCode="1010" countryDescription="Cyprus" countryIso2Code="CY"/>
    <birthdate birthdate="1970-05-01" year="1970" city="Moscow" countryDescription="Russia" countryIso2Code="RU"/>
    <citizenship countryDescription="Russia" countryIso2Code="RU"/>
    <identification identificationTypeCode="passport" number="AB123456" countryDescription="Russia"/>
    <remark>Listed for undermining territorial integrity.</remark>
  </sanctionEntity>
  <sanctionEntity logicalId="99" euReferenceNumber="EU.99.1">
    <regulation programme="SYR" numberTitle="36/2012" publicationDate="2012-01-18"/>
    <subjectType code="enterprise" classificationCode="E"/>
    <nameAlias wholeName="Acme Trading LLC" strong="true"/>
  </sanctionEntity>
</export>`;

describe("EU FSF parser", () => {
  it("validates a well-formed document and rejects bad ones", () => {
    expect(looksLikeFsf11(SAMPLE).ok).toBe(true);
    expect(looksLikeFsf11("<!DOCTYPE html><html><body>error</body></html>").ok).toBe(false);
    expect(looksLikeFsf11(SAMPLE.slice(0, 400)).ok).toBe(false);
  });

  it("normalises Greek and accented names for searching", () => {
    expect(normalizeName("Ιωάννης Πέτρου")).toBe("IOANNIS PETROY");
    expect(normalizeName("Müller-Schmidt, José")).toBe("MULLER SCHMIDT JOSE");
  });

  it("maps person and entity records", () => {
    const records = [...iterateEntities(SAMPLE)];
    expect(records).toHaveLength(2);

    const person = records[0]!;
    expect(person.source_record_id).toBe("EU.27.28");
    expect(person.entity_type).toBe("person");
    expect(person.primary_name).toBe("Ivan Petrov");
    expect(person.primary_name_normalized).toBe("IVAN PETROV");
    expect(person.name_original_script).toBe("Ιωάννης Πέτρου");
    expect(person.sanctions_programme).toBe("UKR");
    expect(person.legal_basis).toBe("269/2014 (OJ L78)");
    expect(person.designation_date).toBe("2014-03-17");
    expect(person.listing_reason).toContain("territorial integrity");
    expect(person.aliases.filter((a) => a.is_primary)).toHaveLength(1);
    expect(person.aliases[1]!.alias_type).toBe("weak alias");
    expect(person.addresses[0]!.full_address).toContain("Nicosia");
    expect(person.identifiers[0]).toMatchObject({ identifier_type: "passport", identifier_value: "AB123456" });
    expect(person.person?.nationalities).toEqual(["Russia"]);
    expect(person.person?.gender).toBe("M");

    const entity = records[1]!;
    expect(entity.entity_type).toBe("entity");
    expect(entity.primary_name).toBe("Acme Trading LLC");
    expect(entity.person).toBeUndefined();
  });

  it("produces a stable fingerprint that changes with content", () => {
    const [first] = [...iterateEntities(SAMPLE)];
    const [again] = [...iterateEntities(SAMPLE)];
    expect(recordFingerprint(first!)).toBe(recordFingerprint(again!));
    const mutated = { ...first!, primary_name: "Ivan Petroff" };
    expect(recordFingerprint(mutated)).not.toBe(recordFingerprint(first!));
  });
});
