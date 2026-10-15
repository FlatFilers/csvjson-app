import { describe, expect, it } from "vitest";
import { parseCsvTable } from "../csvTable";
import { csvWarnings } from "../convert";
import { deleteColumns, deleteRows, renameHeader } from "../tableDeletion";

describe("deleteRows (byte-preserving splice)", () => {
  it("removes a middle row and its own terminator, byte-exact", () => {
    const raw = "a,b\r\n1,2\r\n3,4\r\n5,6\r\n";
    expect(deleteRows(raw, parseCsvTable(raw), [1])).toBe("a,b\r\n1,2\r\n5,6\r\n");
  });

  it("deleting the first data row removes its own trailing terminator", () => {
    const raw = "a,b\r\n1,2\r\n3,4";
    expect(deleteRows(raw, parseCsvTable(raw), [0])).toBe("a,b\r\n3,4");
  });

  it("deleting the last data row of a trailing-newline file leaves no stray blank line", () => {
    const raw = "a,b\n1,2\n3,4\n";
    expect(deleteRows(raw, parseCsvTable(raw), [1])).toBe("a,b\n1,2\n");
  });

  it("deleting the last data row of a file without a trailing newline removes just the span", () => {
    const raw = "a,b\n1,2\n3,4";
    // The surviving row's own terminator becomes the file's ending.
    expect(deleteRows(raw, parseCsvTable(raw), [1])).toBe("a,b\n1,2\n");
  });

  it("mixed endings: each surviving row keeps its own terminator", () => {
    const raw = "a,b\r\n1,2\n3,4\r\n5,6";
    expect(deleteRows(raw, parseCsvTable(raw), [1])).toBe("a,b\r\n1,2\n5,6");
  });

  it("delete-all-rows leaves a headers-only file, byte-faithful", () => {
    const raw = "a,b\r\n1,2\r\n3,4\r\n";
    expect(deleteRows(raw, parseCsvTable(raw), [0, 1])).toBe("a,b\r\n");
  });

  it("delete-all-rows on a file without a trailing newline keeps the header's own terminator", () => {
    const raw = "a,b\n1,2";
    expect(deleteRows(raw, parseCsvTable(raw), [0])).toBe("a,b\n");
  });

  it("preserves the UTF-8 BOM", () => {
    const raw = "\uFEFFa,b\r\n1,2\r\n3,4";
    expect(deleteRows(raw, parseCsvTable(raw), [0])).toBe("\uFEFFa,b\r\n3,4");
  });

  it("surviving rows keep their exact bytes — quoted ragged fields survive untouched", () => {
    const raw = 'a,b\n"1,2",3\n4,5';
    // "4,5" is the last row without a trailing newline — just its span goes;
    // the quoted row's own terminator becomes the file's ending.
    expect(deleteRows(raw, parseCsvTable(raw), [1])).toBe('a,b\n"1,2",3\n');
  });

  it("ragged extra fields survive an unrelated row's deletion", () => {
    const raw = "x,y,z\n1,2,3\nr,s,t,EXTRA1,EXTRA2\n4,5,6";
    const next = deleteRows(raw, parseCsvTable(raw), [0]);
    expect(next).toBe("x,y,z\nr,s,t,EXTRA1,EXTRA2\n4,5,6");
    const parsed = parseCsvTable(next);
    expect(parsed.rowWidths).toEqual([5, 3]);
  });

  it("ignores out-of-range indices and an empty selection", () => {
    const raw = "a,b\n1,2";
    const table = parseCsvTable(raw);
    expect(deleteRows(raw, table, [5, -1])).toBe(raw);
    expect(deleteRows(raw, table, [])).toBe(raw);
  });

  it("re-parses to the expected grid", () => {
    const raw = "a,b\r\n1,2\r\n3,4\r\n5,6\r\n";
    const next = parseCsvTable(deleteRows(raw, parseCsvTable(raw), [1]));
    expect(next.headers).toEqual(["a", "b"]);
    expect(next.rows).toEqual([["1", "2"], ["5", "6"]]);
  });
});

describe("deleteColumns (per-record byte-preserving splice)", () => {
  it("rewrites only the header and every record containing the field, CRLF preserved", () => {
    const raw = "a,b,c\r\n1,2,3\r\n4,5,6\r\n";
    expect(deleteColumns(raw, parseCsvTable(raw), [1])).toBe("a,c\r\n1,3\r\n4,6\r\n");
  });

  it("preserves the UTF-8 BOM", () => {
    const raw = "\uFEFFa,b,c\n1,2,3";
    expect(deleteColumns(raw, parseCsvTable(raw), [0])).toBe("\uFEFFb,c\n2,3");
  });

  it("a file without a trailing newline stays without one", () => {
    const raw = "a,b,c\n1,2,3\n4,5,6";
    expect(deleteColumns(raw, parseCsvTable(raw), [2])).toBe("a,b\n1,2\n4,5");
  });

  it("short ragged rows lacking the field stay byte-identical", () => {
    const raw = "a,b,c\n1,2\nx,y,z,EXTRA\n3";
    const next = deleteColumns(raw, parseCsvTable(raw), [2]);
    expect(next).toBe("a,b\n1,2\nx,y,EXTRA\n3");
    // "1,2" and "3" were never spliced — only the header and the wide row
    // were rewritten. Re-parse confirms the raw widths are unchanged.
    expect(parseCsvTable(next).rowWidths).toEqual([2, 3, 1]);
  });

  it("quoted fields with embedded delimiters and newlines round-trip alongside plain rows", () => {
    const raw = 'a,b,c\r\n"1,5",2,3\r\n4,5,"multi\r\nline"\r\nplain,6,7';
    const next = deleteColumns(raw, parseCsvTable(raw), [0]);
    expect(next).toBe('b,c\r\n2,3\r\n5,"multi\r\nline"\r\n6,7');
    const parsed = parseCsvTable(next);
    expect(parsed.rows).toEqual([["2", "3"], ["5", "multi\r\nline"], ["6", "7"]]);
  });

  it("handles a headers-only table", () => {
    const raw = "a,b,c";
    expect(deleteColumns(raw, parseCsvTable(raw), [1])).toBe("a,c");
  });

  it("ignores out-of-range columns and an empty selection", () => {
    const raw = "a,b\n1,2";
    const table = parseCsvTable(raw);
    expect(deleteColumns(raw, table, [7])).toBe(raw);
    expect(deleteColumns(raw, table, [])).toBe(raw);
  });

  it("re-parses to the expected grid", () => {
    const raw = "a,b,c\n1,2,3\n4,5,6";
    const next = parseCsvTable(deleteColumns(raw, parseCsvTable(raw), [0, 2]));
    expect(next.headers).toEqual(["b"]);
    expect(next.rows).toEqual([["2"], ["5"]]);
  });
});

describe("malformed-CSV warning persistence across deletion", () => {
  const ragged = "x,y,z\n1,2,3\nr,s,t,EXTRA1,EXTRA2\n4,5,6";

  it("row deletion keeps warnings for surviving ragged rows", () => {
    expect(csvWarnings(ragged, ",")).toEqual([
      "Row 2 has more fields than the header, extra fields dropped",
    ]);
    const next = deleteRows(ragged, parseCsvTable(ragged), [0]);
    expect(next).toBe("x,y,z\nr,s,t,EXTRA1,EXTRA2\n4,5,6");
    expect(csvWarnings(next, ",")).toEqual([
      "Row 1 has more fields than the header, extra fields dropped",
    ]);
  });

  it("deleting the malformed row clears its warning naturally", () => {
    const next = deleteRows(ragged, parseCsvTable(ragged), [1]);
    expect(next).toBe("x,y,z\n1,2,3\n4,5,6");
    expect(csvWarnings(next, ",")).toEqual([]);
  });

  it("column deletion keeps warnings when the surviving row is still ragged", () => {
    const next = deleteColumns(ragged, parseCsvTable(ragged), [0]);
    // 4 surviving fields against a 2-field header — still wide.
    expect(next).toBe("y,z\n2,3\ns,t,EXTRA1,EXTRA2\n5,6");
    expect(csvWarnings(next, ",")).toEqual([
      "Row 2 has more fields than the header, extra fields dropped",
    ]);
  });
});

describe("renameHeader (byte-preserving record-0 splice)", () => {
  it("renames a column header and keeps CRLF data rows and trailing newline byte-identical", () => {
    const raw = "album,year\r\nDe Stijl,2000\r\nElephant,2003\r\n";
    const next = renameHeader(raw, parseCsvTable(raw), 0, "record_title");
    expect(next).toBe("record_title,year\r\nDe Stijl,2000\r\nElephant,2003\r\n");
  });

  it("preserves a leading UTF-8 BOM and mixed line endings in data rows", () => {
    const raw = "\uFEFFa,b,c\r\n1,2,3\n4,5,6\r\n7,8,9";
    const next = renameHeader(raw, parseCsvTable(raw), 1, "beta");
    expect(next).toBe("\uFEFFa,beta,c\r\n1,2,3\n4,5,6\r\n7,8,9");
  });

  it("quotes the new header name when it contains delimiters, quotes, or newlines", () => {
    const raw = 'a,b\n"1,2",3';
    expect(renameHeader(raw, parseCsvTable(raw), 0, "first, name")).toBe(
      '"first, name",b\n"1,2",3'
    );
    expect(renameHeader(raw, parseCsvTable(raw), 1, 'val "x"')).toBe(
      'a,"val ""x"""\n"1,2",3'
    );
  });

  it("preserves ragged extra fields and short rows byte-for-byte", () => {
    const raw = "x,y,z\n1,2\nr,s,t,EXTRA1,EXTRA2\n4,5,6";
    const next = renameHeader(raw, parseCsvTable(raw), 2, "zeta");
    expect(next).toBe("x,y,zeta\n1,2\nr,s,t,EXTRA1,EXTRA2\n4,5,6");
    expect(csvWarnings(next, ",")).toEqual([
      "Row 1 has fewer fields than the header, padded",
      "Row 2 has more fields than the header, extra fields dropped",
    ]);
  });

  it("respects non-comma delimiters (TSV and semicolon)", () => {
    const tsv = "a\tb\r\n1\t2";
    expect(renameHeader(tsv, parseCsvTable(tsv), 1, "col_b")).toBe("a\tcol_b\r\n1\t2");
    const semi = "a;b\n1;2";
    expect(renameHeader(semi, parseCsvTable(semi, ";"), 0, "first;col")).toBe(
      '"first;col";b\n1;2'
    );
  });

  it("handles a headers-only table with or without a trailing newline", () => {
    expect(renameHeader("a,b,c", parseCsvTable("a,b,c"), 1, "B")).toBe("a,B,c");
    expect(renameHeader("a,b,c\r\n", parseCsvTable("a,b,c\r\n"), 2, "C")).toBe("a,b,C\r\n");
  });

  it("returns the original string for out-of-range indices or a no-op rename", () => {
    const raw = "a,b\n1,2";
    const table = parseCsvTable(raw);
    expect(renameHeader(raw, table, -1, "z")).toBe(raw);
    expect(renameHeader(raw, table, 5, "z")).toBe(raw);
    expect(renameHeader(raw, table, 0, "a")).toBe(raw);
  });
});

