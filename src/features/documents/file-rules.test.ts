import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, formatBytes, validateFile } from "./file-rules";

const file = (name: string, size = 10) => ({ name, size });

describe("validateFile", () => {
  it.each(["rfp.pdf", "notes.docx", "readme.TXT", "spec.md", "a.b.Pdf"])("accepts %s", (name) => {
    expect(validateFile(file(name))).toBeNull();
  });

  it.each(["setup.exe", "sheet.xlsx", "doc.doc", "pdf", ".pdf", "archive.pdf.zip"])("rejects %s", (name) => {
    expect(validateFile(file(name))).toMatch(/unsupported file type/i);
  });

  it("rejects empty files", () => {
    expect(validateFile(file("rfp.pdf", 0))).toBe("The file is empty.");
  });

  it("allows exactly the size limit and rejects anything larger", () => {
    expect(validateFile(file("rfp.pdf", MAX_UPLOAD_BYTES))).toBeNull();
    expect(validateFile(file("rfp.pdf", MAX_UPLOAD_BYTES + 1))).toBe("The file is larger than 25 MB.");
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [25 * 1024 * 1024, "25 MB"],
  ])("%d → %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});
