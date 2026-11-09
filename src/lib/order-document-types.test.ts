import { describe, expect, it } from "vitest";
import { detectDocumentType } from "./orders.server";

const bytes = (...values: number[]) => Uint8Array.from([...values, 0, 0, 0, 0]);
const zip = bytes(0x50, 0x4b, 0x03, 0x04);

describe("order document upload types", () => {
  it("accepts a real ZIP bundle named .zip", () => {
    expect(detectDocumentType(zip, "Certificates.ZIP")).toBe("application/zip");
  });

  it("still refuses Word/Excel files that share the ZIP signature", () => {
    expect(detectDocumentType(zip, "letter.docx")).toBeNull();
    expect(detectDocumentType(zip, "sheet.xlsx")).toBeNull();
  });

  it("refuses a file renamed to .zip that is not a ZIP", () => {
    expect(detectDocumentType(bytes(0x3c, 0x68, 0x74, 0x6d), "page.zip")).toBeNull();
  });

  it("keeps accepting PDF, PNG and JPEG", () => {
    expect(detectDocumentType(bytes(0x25, 0x50, 0x44, 0x46, 0x2d), "a.pdf")).toBe("application/pdf");
    expect(detectDocumentType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "a.png")).toBe("image/png");
    expect(detectDocumentType(bytes(0xff, 0xd8, 0xff), "a.jpg")).toBe("image/jpeg");
  });
});
