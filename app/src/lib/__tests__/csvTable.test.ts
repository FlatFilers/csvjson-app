import { describe, expect, it } from "vitest";
import {
  detectDelimiter,
  numericColumns,
  parseCsvRecord,
  parseCsvTable,
  serializeCsvRow,
  serializeCsvTable,
} from "../csvTable";

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

  it("reports raw row widths before padding and truncation", () => {
    const table = parseCsvTable("a,b,c\n1\n1,2,3,4\n5,6");
    expect(table.rowWidths).toEqual([1, 4, 2]);
    expect(table.rows).toEqual([
      ["1", "", ""],
      ["1", "2", "3"],
      ["5", "6", ""],
    ]);
  });

  it("keeps quoted newlines and blank lines in the raw widths", () => {
    const table = parseCsvTable('a,b\n"x\ny",1\n\n2');
    // The quoted field spans two lines but is one record; the blank line
    // is a record of its own (width 1) that convert.ts skips by content.
    expect(table.rowWidths).toEqual([2, 1, 1]);
    expect(table.rows[0]).toEqual(["x\ny", "1"]);
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

describe("serializeCsvTable", () => {
  /** parse → serialize → parse: the grid must survive the round trip. */
  function roundTrip(text: string, delimiter?: string) {
    const first = parseCsvTable(text, delimiter);
    const serialized = serializeCsvTable(first.headers, first.rows, first.delimiter);
    const second = parseCsvTable(serialized, delimiter);
    return { first, serialized, second };
  }

  it("round-trips plain comma CSV byte-identically", () => {
    const text = "album,year\nDe Stijl,2000\nElephant,2003";
    const { serialized, second } = roundTrip(text);
    expect(serialized).toBe(text);
    expect(second.rows).toEqual([
      ["De Stijl", "2000"],
      ["Elephant", "2003"],
    ]);
  });

  it("quotes cells containing commas, CR, and LF", () => {
    const { serialized, second } = roundTrip(
      'name,note\n"Mac,jobs","line one\nline two"\r\nplain,"crlf\r\nhere"\n'
    );
    expect(serialized).toBe(
      'name,note\n"Mac,jobs","line one\nline two"\nplain,"crlf\r\nhere"'
    );
    expect(second.rows).toEqual([
      ["Mac,jobs", "line one\nline two"],
      ["plain", "crlf\r\nhere"],
    ]);
  });

  it("doubles embedded quotes so they survive re-parsing", () => {
    const grid = { headers: ["id", "quote"], rows: [["1", 'say "hi"']] };
    const serialized = serializeCsvTable(grid.headers, grid.rows);
    expect(serialized).toBe('id,quote\n1,"say ""hi"""');
    const reparsed = parseCsvTable(serialized);
    expect(reparsed.rows).toEqual(grid.rows);
  });

  it("keeps empty cells, empty header cells, and a fully empty grid", () => {
    const { serialized, second } = roundTrip("a,,c\n,,\n1,,3");
    expect(serialized).toBe("a,,c\n,,\n1,,3");
    expect(second.rows).toEqual([
      ["", "", ""],
      ["1", "", "3"],
    ]);
    expect(serializeCsvTable([], [])).toBe("");
  });

  it("is stable: re-serializing a round-tripped grid yields the same text", () => {
    const text = 'a,b\n"x,y",he said "ok"\n1,2\n';
    const once = serializeCsvTable(
      parseCsvTable(text).headers,
      parseCsvTable(text).rows
    );
    const twice = serializeCsvTable(
      parseCsvTable(once).headers,
      parseCsvTable(once).rows
    );
    expect(twice).toBe(once);
    // Canonical form drops the trailing newline and the needlessly quoted
    // cells; the parsed grid is identical either way.
    expect(parseCsvTable(once).rows).toEqual(parseCsvTable(text).rows);
  });

  it("serializes a forced non-comma delimiter without comma-quoting cells", () => {
    const table = parseCsvTable("a\tb\n1\t2", "\t");
    const serialized = serializeCsvTable(table.headers, table.rows, table.delimiter);
    expect(serialized).toBe("a\tb\n1\t2");
    // A cell containing the active delimiter must be quoted to re-parse.
    const grid = { headers: ["a", "b"], rows: [["1", "x\ty"]] };
    const quoted = serializeCsvTable(grid.headers, grid.rows, "\t");
    expect(quoted).toBe('a\tb\n1\t"x\ty"');
    expect(parseCsvTable(quoted, "\t").rows).toEqual(grid.rows);
  });
});

describe("parseCsvTable row spans", () => {
  it("maps each data row to its exact byte span, terminators excluded", () => {
    const text = "album,year\nDe Stijl,2000\nElephant,2003\n";
    const table = parseCsvTable(text);
    expect(table.rowSpans).toHaveLength(2);
    expect(text.slice(table.rowSpans[0].start, table.rowSpans[0].end)).toBe("De Stijl,2000");
    expect(text.slice(table.rowSpans[1].start, table.rowSpans[1].end)).toBe("Elephant,2003");
  });

  it("keeps CRLF and the trailing newline outside the spans", () => {
    const text = "album,year\r\nDe Stijl,2000\r\nElephant,2003\r\n";
    const table = parseCsvTable(text);
    expect(text.slice(table.rowSpans[0].start, table.rowSpans[0].end)).toBe("De Stijl,2000");
    expect(text.slice(table.rowSpans[1].start, table.rowSpans[1].end)).toBe("Elephant,2003");
  });

  it("reports spans over the caller's text even with a leading BOM", () => {
    const text = "﻿album,year\nDe Stijl,2000";
    const table = parseCsvTable(text);
    expect(text.slice(table.rowSpans[0].start, table.rowSpans[0].end)).toBe("De Stijl,2000");
  });

  it("covers quoted fields with embedded newlines inside one span", () => {
    const text = 'a,b\n"multi\nline",1';
    const table = parseCsvTable(text);
    expect(table.rowSpans).toHaveLength(1);
    expect(text.slice(table.rowSpans[0].start, table.rowSpans[0].end)).toBe('"multi\nline",1');
  });
});

describe("parseCsvRecord", () => {
  it("returns a wide row's true cells — no truncation to header width", () => {
    expect(parseCsvRecord("De Stijl,2000,extra,more")).toEqual([
      "De Stijl",
      "2000",
      "extra",
      "more",
    ]);
  });

  it("returns a short row's true cells — no padding", () => {
    expect(parseCsvRecord("Elephant,2003")).toEqual(["Elephant", "2003"]);
  });

  it("honors a forced delimiter from the table instead of re-detecting", () => {
    // A quoted semicolon must not flip detection away from the table's comma.
    expect(parseCsvRecord('"a;b",c', ",")).toEqual(["a;b", "c"]);
  });
});

describe("serializeCsvRow", () => {
  it("quotes only cells that need it and round-trips through the parser", () => {
    const cells = ["plain", "has, comma", 'has "quote"', "has\nnewline", ""];
    const row = serializeCsvRow(cells);
    expect(row).toBe('plain,"has, comma","has ""quote""","has\nnewline",');
    expect(parseCsvRecord(row)).toEqual(cells);
  });

  it("quotes cells containing the active non-comma delimiter", () => {
    expect(serializeCsvRow(["1", "x\ty"], "\t")).toBe('1\t"x\ty"');
  });
});
