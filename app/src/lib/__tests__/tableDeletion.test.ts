import { describe, expect, it } from "vitest";
import { parseCsvTable } from "../csvTable";
import { serializeTableWithoutColumns, serializeTableWithoutRows } from "../tableDeletion";

describe("serializeTableWithoutRows", () => {
  it("drops the selected source rows and keeps the rest verbatim", () => {
    const table = parseCsvTable("a,b\n1,2\n3,4\n5,6");
    expect(serializeTableWithoutRows(table, [1])).toBe("a,b\n1,2\n5,6");
  });

  it("drops multiple non-adjacent rows regardless of index order", () => {
    const table = parseCsvTable("a\nx\ny\nz");
    expect(serializeTableWithoutRows(table, [2, 0])).toBe("a\ny");
  });

  it("produces a headers-only table when every row is dropped", () => {
    const table = parseCsvTable("a,b\n1,2");
    // serializeCsvTable joins records with newlines — no trailing terminator.
    expect(serializeTableWithoutRows(table, [0])).toBe("a,b");
  });

  it("preserves RFC 4180 quoting on surviving cells", () => {
    const table = parseCsvTable('a,b\n"1,2",3\n4,5');
    expect(serializeTableWithoutRows(table, [1])).toBe('a,b\n"1,2",3');
  });

  it("ignores out-of-range indices", () => {
    const table = parseCsvTable("a\n1\n2");
    expect(serializeTableWithoutRows(table, [5, -1])).toBe("a\n1\n2");
  });
});

describe("serializeTableWithoutColumns", () => {
  it("drops the selected columns' headers and cells", () => {
    const table = parseCsvTable("a,b,c\n1,2,3\n4,5,6");
    expect(serializeTableWithoutColumns(table, [1])).toBe("a,c\n1,3\n4,6");
  });

  it("drops multiple non-adjacent columns", () => {
    const table = parseCsvTable("a,b,c,d\n1,2,3,4");
    expect(serializeTableWithoutColumns(table, [0, 3])).toBe("b,c\n2,3");
  });

  it("preserves RFC 4180 quoting on surviving cells", () => {
    const table = parseCsvTable('a,b,c\n"1,2",3,4');
    expect(serializeTableWithoutColumns(table, [1])).toBe('a,c\n"1,2",4');
  });

  it("round-trips through parseCsvTable", () => {
    const table = parseCsvTable("a,b,c\n1,2,3\n4,5,6");
    const next = parseCsvTable(serializeTableWithoutColumns(table, [0, 2]));
    expect(next.headers).toEqual(["b"]);
    expect(next.rows).toEqual([["2"], ["5"]]);
  });
});
