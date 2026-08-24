import { describe, expect, it } from "vitest";
import { parseReport } from "./parser";

const stored = {
  placement: { ok: true },
  report: {
    ICGId: "CY00001234406861",
    GeneratedAt: "2026-08-24 13:35:38",
    Company: [
      {
        GeneralInfo: [
          {
            Name: "INFOCREDIT GROUP LIMITED",
            NameInLatinCharacters: "INFOCREDIT GROUP LIMITED",
            RegistrationNumber: "C4404",
            VATNumber: "10004404T",
            Website: "www.infocreditgroup.com",
            DateUpdated: "2026-07-21 15:56:10",
            Status: [{ Description: "Active", StartDate: "", EndDate: "" }],
            LegalType: [{ Description: "Limited Company" }],
            CompanyDates: [{ Date: "1972-05-26", Description: "Registration Date" }],
            Address: [
              {
                Type: "Registered Address",
                Active: 1,
                Address: "Hadjigeorgiou Filippou, 5A",
                City: "Akropoli",
                Region: "Nicosia",
                PostalCode: "2006",
                Country: "Cyprus",
                PoBox: "",
              },
              { Type: "Registered Address", Active: 0, Address: "Akadimias Avenue, 21", City: "Aglantzia", Country: "Cyprus" },
            ],
          },
        ],
        MoreInfo: [{ Emails: "info@example.com", Phones: "22888888" }],
        Names: [{ Name: "MECOS LIMITED", NameInLatinCharacters: "MECOS LIMITED", Description: "Registered Name", Status: "Inactive", StartDate: "1972-05-26", EndDate: "2009-06-19" }],
        Identifiers: [{ Description: "VAT Number", Number: "10004404T" }],
        Activities: [
          {
            ActivityCode: [{ Code: "6392", Type: "NACE 2.1", Description: "OTHER INFORMATION SERVICE ACTIVITIES" }],
            AdditionalInfo: [{ Notes: "Based on the disclosed information of the Cyprus Registrar of Companies." }],
          },
        ],
        Administrators: [
          {
            IsCompany: 0,
            FirstName: "THEODOROS",
            LastName: "KRINGOU",
            Position: "Director",
            Nationality: "CYPRIOT",
            StartDate: "2008-02-27",
            Active: 1,
            Identifier: [{ Description: "NID Number", Number: "684760" }],
            Address: [{ Type: "Current address", Active: 1, Address: "Alekou Konstantinou, 30", City: "Strovolos", Country: "Cyprus" }],
          },
        ],
        Shareholders: [
          {
            IsCompany: 1,
            CompanyName: "TCKH HOLDING LTD",
            IssuedShares: "90900",
            SharesPercentage: "90",
            Active: 1,
            StartDate: "2012-12-27",
            Identifier: [{ Description: "Registration Number", Number: "C284743" }],
            Address: [],
          },
        ],
        UltimateBeneficialOwner: [],
        Capitals: [
          {
            Currency: "EUR",
            NominalShares: "101000",
            IssuedShares: "101000",
            NominalPrice: "0.85",
            AuthorisedCapital: "85850",
            PaidUpCapital: "85850",
            ReferenceDate: "2012-12-12",
          },
        ],
        MortgagesCharges: [
          {
            Charges: [
              {
                Type: "Floating Charge on all Company's Assets",
                Amount: "30000",
                Currency: "EUR",
                Beneficiary: "Bank of Cyprus Public Company Limited",
                DateRegistered: "2016-03-01",
                EndDate: "",
              },
            ],
            Mortgages: [],
          },
        ],
        ParentCompany: [{ CompanyName: "ALPHA INTERNATIONAL HOLDINGS S.A.", Percentage: "100", RegistrationNumber: "155249901000", Address: [] }],
        Subsidiaries: [],
        Affiliates: [],
        Branches: [],
        BranchParent: [],
        ICGScoring: [
          { Score: 35, CreditLimit: "351370", Description: "High Risk", EstimatedAt: "2026-08-24 13:35:38", FinancialYear: 2022 },
          { Score: 30, CreditLimit: "165092.50", Description: "High Risk", EstimatedAt: "2026-08-24 13:35:38", FinancialYear: 2021 },
        ],
        KeyRatios: [
          { type: "Consolidated Financial Statements", year: "2022", ratios: { Liquidity: { "Current Ratio": 1.1 } } },
        ],
        StatementOfProfitAndLoss: [
          {
            type: "Consolidated Financial Statements",
            year: "2022",
            currency: "EUR",
            statement: { Revenue: [{ key: "Net Sales", name: "Revenue", value: 70274000 }] },
          },
        ],
        StatementOfFinancialPosition: [
          {
            type: "Consolidated Financial Statements",
            year: "2022",
            currency: "EUR",
            statement: { Assets: { Totals: [{ key: "Assets", name: "Total Assets", value: 2956975000 }] } },
          },
        ],
        Negatives: [{ UnpaidBills: [], Bankruptcies: [] }],
        CorporateStructureDetrimental: [
          { "LegalEntities-Status": [{ Status: "Dissolved", RegNumber: "C336441", CompanyName: "CYPCODIRECT HOLDINGS LIMITED" }] },
        ],
      },
    ],
  },
};

describe("parseReport", () => {
  const report = parseReport(stored, "credit")!;

  it("reads the company identity", () => {
    expect(report.general.name).toBe("INFOCREDIT GROUP LIMITED");
    expect(report.general.registrationNumber).toBe("C4404");
    expect(report.general.status).toBe("Active");
    expect(report.general.legalType).toBe("Limited Company");
    expect(report.general.phone).toBe("22888888");
    expect(report.icgId).toBe("CY00001234406861");
    expect(report.general.addresses[0]?.active).toBe(true);
    expect(report.general.addresses[1]?.active).toBe(false);
  });

  it("reads people, shares and charges", () => {
    expect(report.administrators[0]?.name).toBe("THEODOROS KRINGOU");
    expect(report.administrators[0]?.position).toBe("Director");
    expect(report.shareholders[0]?.name).toBe("TCKH HOLDING LTD");
    expect(report.shareholders[0]?.isCompany).toBe(true);
    expect(report.shareholders[0]?.sharesPercentage).toBe("90");
    expect(report.capitals[0]?.paidUpCapital).toBe("85850");
    expect(report.charges).toHaveLength(1);
    expect(report.charges[0]?.beneficiary).toContain("Bank of Cyprus");
    expect(report.related.map((row) => row.role)).toEqual(["Parent"]);
  });

  it("reads scoring, ratios and financials newest first", () => {
    expect(report.scoring[0]?.year).toBe(2022);
    expect(report.scoring[0]?.score).toBe(35);
    expect(report.ratios[0]?.blocks[0]?.entries[0]).toEqual({ name: "Current Ratio", value: 1.1 });
    expect(report.incomeStatements[0]?.groups[0]?.lines[0]?.value).toBe(70274000);
    expect(report.balanceSheets[0]?.groups[0]?.heading).toBe("Assets — Totals");
    expect(report.hasFinancials).toBe(true);
  });

  it("summarises negative information", () => {
    expect(report.negatives).toEqual({ unpaidBills: 0, bankruptcies: 0 });
    expect(report.detrimental[0]).toEqual({
      label: "Status",
      company: "CYPCODIRECT HOLDINGS LIMITED",
      registrationNumber: "C336441",
      detail: "Dissolved",
    });
  });

  it("returns null for payloads without a company", () => {
    expect(parseReport({ report: { Company: [] } }, "structure")).toBeNull();
  });
});
