import { describe, expect, it } from "vitest";
import {
  detectDelimiter,
  numericColumns,
  parseCsvTable,
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
