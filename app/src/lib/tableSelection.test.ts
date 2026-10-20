import { describe, expect, it } from "vitest";
import { parseCsvTable } from "./csvTable";
import { computeSelectionStats, serializeGridSelection } from "./tableSelection";

const SAMPLE_CSV = [
  "item,qty,price,notes",
  "Apple,10,1.5,fresh",
  "Banana,20,0.75,",
  "Apple,10,-2.25,discount",
  "Cherry,,4.0,  ",
  "Date,5,0,sweet",
].join("\n");

describe("computeSelectionStats", () => {
  const table = parseCsvTable(SAMPLE_CSV);
  const fullView = [0, 1, 2, 3, 4];
  const GUTTER = 1;

  it("returns null when nothing is selected", () => {
    expect(
      computeSelectionStats(table, fullView, { ranges: [], rows: [], columns: [] }, GUTTER)
    ).toBeNull();
  });

  it("returns null when only a single cell is selected without a row or column selection", () => {
    expect(
      computeSelectionStats(
        table,
        fullView,
        {
          ranges: [{ x: 1, y: 0, width: 1, height: 1 }],
          rows: [],
          columns: [],
        },
        GUTTER
      )
    ).toBeNull();
  });

  it("returns stats for a 1-cell whole-row or whole-column selection on a 1x1 table", () => {
    const oneCellTable = parseCsvTable("score\n42");
    const rowStats = computeSelectionStats(
      oneCellTable,
      [0],
      { ranges: [], rows: [0], columns: [] },
      GUTTER
    );
    expect(rowStats).toEqual({
      cellCount: 1,
      distinctCount: 1,
      emptyCount: 0,
      numericCount: 1,
      sum: 42,
      avg: 42,
      min: 42,
      max: 42,
    });

    const colStats = computeSelectionStats(
      oneCellTable,
      [0],
      { ranges: [], rows: [], columns: [1] },
      GUTTER
    );
    expect(colStats).toEqual(rowStats);
  });

  it("computes aggregates across a rectangular cell range with mixed numeric, text, and empty cells", () => {
    // Select data columns 0..2 (item, qty, price -> grid cols 1..3), rows 0..3 (first 4 rows) = 12 cells
    const stats = computeSelectionStats(
      table,
      fullView,
      {
        ranges: [{ x: 1, y: 0, width: 3, height: 4 }],
        rows: [],
        columns: [],
      },
      GUTTER
    );
    // Cells:
    // row 0: Apple, 10, 1.5
    // row 1: Banana, 20, 0.75
    // row 2: Apple, 10, -2.25
    // row 3: Cherry, "", 4.0
    // Total = 12 cells; Empty = 1 (row 3 qty); non-empty = 11
    // Distinct non-empty: Apple, 10, 1.5, Banana, 20, 0.75, -2.25, Cherry, 4.0 -> 9 distinct
    // Numerics: 10, 1.5, 20, 0.75, 10, -2.25, 4.0 -> 7 numeric values
    // Sum = 10 + 1.5 + 20 + 0.75 + 10 - 2.25 + 4.0 = 44
    expect(stats).not.toBeNull();
    expect(stats?.cellCount).toBe(12);
    expect(stats?.emptyCount).toBe(1);
    expect(stats?.distinctCount).toBe(9);
    expect(stats?.numericCount).toBe(7);
    expect(stats?.sum).toBeCloseTo(44, 6);
    expect(stats?.avg).toBeCloseTo(44 / 7, 6);
    expect(stats?.min).toBe(-2.25);
    expect(stats?.max).toBe(20);
  });

  it("skips gutter columns (< gutterColumns) when a range starts at x = 0", () => {
    // x: 0, width: 2 with gutterColumns = 1 covers gutter (col 0) and data col 0 (grid col 1)
    const stats = computeSelectionStats(
      table,
      fullView,
      {
        ranges: [{ x: 0, y: 0, width: 2, height: 3 }],
        rows: [],
        columns: [],
      },
      GUTTER
    );
    // Data col 0 across rows 0, 1, 2: "Apple", "Banana", "Apple"
    expect(stats).toEqual({
      cellCount: 3,
      distinctCount: 2,
      emptyCount: 0,
      numericCount: 0,
      sum: null,
      avg: null,
      min: null,
      max: null,
    });
  });

  it("computes aggregates across multi-row selections in filtered/sorted view order", () => {
    // Filtered view showing only source rows 0, 2, 4
    const filteredView = [0, 2, 4];
    // Select view rows 0 and 2 (which map to source rows 0 and 4)
    const stats = computeSelectionStats(
      table,
      filteredView,
      {
        ranges: [],
        rows: [0, 2],
        columns: [],
      },
      GUTTER
    );
    // Source row 0: Apple, 10, 1.5, fresh
    // Source row 4: Date, 5, 0, sweet
    // 8 cells total, 0 empty, 8 distinct, 4 numeric (10, 1.5, 5, 0) -> sum 16.5, avg 4.125, min 0, max 10
    expect(stats).toEqual({
      cellCount: 8,
      distinctCount: 8,
      emptyCount: 0,
      numericCount: 4,
      sum: 16.5,
      avg: 4.125,
      min: 0,
      max: 10,
    });
  });

  it("computes aggregates across multi-column selections and handles whitespace-only cells as empty", () => {
    // Select grid columns 2 (qty) and 4 (notes) across all 5 rows = 10 cells
    const stats = computeSelectionStats(
      table,
      fullView,
      {
        ranges: [],
        rows: [],
        columns: [2, 4],
      },
      GUTTER
    );
    // qty: "10", "20", "10", "", "5" (1 empty, 4 numeric: 10, 20, 10, 5; 3 distinct: 10, 20, 5)
    // notes: "fresh", "", "discount", "  " (whitespace -> empty), "sweet" (2 empty, 3 distinct: fresh, discount, sweet)
    expect(stats).toEqual({
      cellCount: 10,
      distinctCount: 6,
      emptyCount: 3,
      numericCount: 4,
      sum: 45,
      avg: 11.25,
      min: 5,
      max: 20,
    });
  });

  it("deduplicates overlapping coordinates across ranges, rows, and columns", () => {
    const stats = computeSelectionStats(
      table,
      fullView,
      {
        ranges: [{ x: 1, y: 0, width: 2, height: 2 }],
        rows: [0],
        columns: [1],
      },
      GUTTER
    );
    // Row 0 has 4 cells: (0,0), (0,1), (0,2), (0,3)
    // Col 1 (dataCol 0) has 5 cells: (0,0), (1,0), (2,0), (3,0), (4,0) -> adds 4 new cells
    // Range covers (0,0), (0,1), (1,0), (1,1) -> only (1,1) is new!
    // Total unique cells = 4 + 4 + 1 = 9
    expect(stats?.cellCount).toBe(9);
  });

  it("parses negative, decimal, and scientific-notation numbers while rejecting non-numeric strings", () => {
    const numTable = parseCsvTable(
      ["v1,v2", "-12.5,.5", "+3.25,1e2", "-2.5e-1,12px", "NaN,Infinity", "1e500,-"].join("\n")
    );
    const stats = computeSelectionStats(
      numTable,
      [0, 1, 2, 3, 4],
      { ranges: [], rows: [0, 1, 2, 3, 4], columns: [] },
      GUTTER
    );
    // Valid numbers: -12.5, 0.5, 3.25, 100, -0.25 -> 5 numbers
    // Sum = -12.5 + 0.5 + 3.25 + 100 - 0.25 = 91
    // Avg = 91 / 5 = 18.2
    // Min = -12.5, Max = 100
    expect(stats).toEqual({
      cellCount: 10,
      distinctCount: 10,
      emptyCount: 0,
      numericCount: 5,
      sum: 91,
      avg: 18.2,
      min: -12.5,
      max: 100,
    });
  });
});

describe("serializeGridSelection", () => {
  const table = parseCsvTable("a,b\n1,2\n3,4");
  const view = [0, 1];

  it("serializes a rectangular range selection with matching headers", () => {
    expect(
      serializeGridSelection(
        table,
        view,
        { ranges: [{ x: 1, y: 0, width: 2, height: 1 }], rows: [], columns: [] },
        1
      )
    ).toBe("a,b\n1,2");
  });
});
