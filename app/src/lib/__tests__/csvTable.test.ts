import { describe, expect, it } from "vitest";
import { detectDelimiter, numericColumns, parseCsvTable } from "../csvTable";

describe("detectDelimiter", () => {
  it("picks comma, semicolon, and tab by frequency", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("ignores delimiters inside quoted fields", () => {
    // Semicolons outnumber commas once quoted commas are excluded.
    expect(detectDelimiter('"a,b";c\n1;2;3')).toBe(";");
  });

  it("falls back to comma when nothing is detected", () => {
    expect(detectDelimiter("single")).toBe(",");
  });
});

describe("parseCsvTable", () => {
  it("parses quoted fields with embedded delimiters and newlines", () => {
    const table = parseCsvTable(
      'name,notes\n"De Stijl",2000\n"has, comma"" and\nnewline",2001'
    );
    expect(table.headers).toEqual(["name", "notes"]);
    expect(table.rows).toEqual([
      ["De Stijl", "2000"],
      ["has, comma\" and\nnewline", "2001"],
    ]);
  });

  it("pads ragged rows and truncates extras", () => {
    const table = parseCsvTable("a,b,c\n1\n1,2,3,4");
    expect(table.rows[0]).toEqual(["1", "", ""]);
    expect(table.rows[1]).toEqual(["1", "2", "3"]);
  });

  it("strips a UTF-8 BOM before header detection", () => {
    const table = parseCsvTable("\uFEFFalbum,year\nDe Stijl,2000");
    expect(table.headers).toEqual(["album", "year"]);
  });
});

describe("parseCsvTable line endings", () => {
  it("accepts CRLF and trailing newlines without phantom rows", () => {
    const table = parseCsvTable("a,b\r\n1,2\r\n");
    expect(table.headers).toEqual(["a", "b"]);
    expect(table.rows).toEqual([["1", "2"]]);
  });
});

describe("numericColumns", () => {
  it("marks columns that are entirely numeric", () => {
    const table = parseCsvTable("name,year,note\nDe Stijl,2000,00721\nElephant,2003,x");
    const flags = numericColumns(table);
    expect(flags[0]).toBe(false);
    expect(flags[1]).toBe(true);
    expect(flags[2]).toBe(false);
  });
});
