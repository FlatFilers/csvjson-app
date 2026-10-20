import { describe, expect, it } from "vitest";
import { DEFAULT_OPTIONS } from "@/lib/convert";
import {
  extractEgressRows,
  formatEgressOutput,
  formatJsonLines,
  formatSqlOutput,
  formatSqlValue,
  formatTsPropertyKey,
  formatTypeScriptOutput,
  inferSqlColumnType,
  inferTsPropertyType,
  quoteSqlIdentifier,
  sanitizeSqlTableName,
} from "@/lib/egressFormat";

describe("sanitizeSqlTableName", () => {
  it("falls back to 'data' when filename is null, undefined, or empty", () => {
    expect(sanitizeSqlTableName(null)).toBe("data");
    expect(sanitizeSqlTableName(undefined)).toBe("data");
    expect(sanitizeSqlTableName("")).toBe("data");
    expect(sanitizeSqlTableName("   ")).toBe("data");
  });

  it("strips data extensions and replaces non-alphanumeric characters with underscores", () => {
    expect(sanitizeSqlTableName("customers-2026.csv")).toBe("customers_2026");
    expect(sanitizeSqlTableName("Q4 Sales Report.tsv")).toBe(
      "Q4_Sales_Report"
    );
    expect(sanitizeSqlTableName("export.csv.txt")).toBe("export");
  });

  it("handles leading digits and falls back when only punctuation remains", () => {
    expect(sanitizeSqlTableName("2026_metrics.csv")).toBe("2026_metrics");
    expect(sanitizeSqlTableName("---.csv")).toBe("data");
  });
});

describe("SQL helpers", () => {
  it("double-quotes identifiers and escapes embedded double quotes", () => {
    expect(quoteSqlIdentifier("album_name")).toBe('"album_name"');
    expect(quoteSqlIdentifier('weird"col')).toBe('"weird""col"');
  });

  it("infers INTEGER, NUMERIC, BOOLEAN, and TEXT column types across rows", () => {
    expect(inferSqlColumnType([1, 2, null, 42])).toBe("INTEGER");
    expect(inferSqlColumnType([1, 2.5, null])).toBe("NUMERIC");
    expect(inferSqlColumnType([true, false, null])).toBe("BOOLEAN");
    expect(inferSqlColumnType(["a", "b"])).toBe("TEXT");
    expect(inferSqlColumnType([1, "two"])).toBe("TEXT");
    expect(inferSqlColumnType([null, undefined])).toBe("TEXT");
  });

  it("escapes SQL literal values safely including single quotes, nulls, booleans, and JSON objects", () => {
    expect(formatSqlValue(null)).toBe("NULL");
    expect(formatSqlValue(undefined)).toBe("NULL");
    expect(formatSqlValue(42)).toBe("42");
    expect(formatSqlValue(3.14)).toBe("3.14");
    expect(formatSqlValue(true)).toBe("TRUE");
    expect(formatSqlValue(false)).toBe("FALSE");
    expect(formatSqlValue("O'Reilly's Book")).toBe("'O''Reilly''s Book'");
    expect(formatSqlValue({ tag: "a'b" })).toBe('\'{"tag":"a\'\'b"}\'');
  });

  it("emits CREATE TABLE and batched INSERT statements with inferred types and escaped values", () => {
    const rows = [
      { id: 1, name: "O'Connor", score: 98.5, active: true, notes: null },
      { id: 2, name: "Ada", score: 100, active: false, notes: "top" },
    ];
    const sql = formatSqlOutput(JSON.stringify(rows), "user-scores.csv");
    expect(sql).toBe(
      [
        'CREATE TABLE "user_scores" (',
        '  "id" INTEGER,',
        '  "name" TEXT,',
        '  "score" NUMERIC,',
        '  "active" BOOLEAN,',
        '  "notes" TEXT',
        ");",
        "",
        'INSERT INTO "user_scores" ("id", "name", "score", "active", "notes") VALUES',
        "  (1, 'O''Connor', 98.5, TRUE, NULL),",
        "  (2, 'Ada', 100, FALSE, 'top');",
      ].join("\n")
    );
  });

  it("emits CREATE TABLE when row list is empty", () => {
    expect(formatSqlOutput("[]", "empty_table.csv")).toBe(
      'CREATE TABLE "empty_table" ();'
    );
  });
});

describe("TypeScript helpers", () => {
  it("formats valid TypeScript identifiers bare and quotes non-identifier keys", () => {
    expect(formatTsPropertyKey("userName")).toBe("userName");
    expect(formatTsPropertyKey("$id_1")).toBe("$id_1");
    expect(formatTsPropertyKey("first name")).toBe('"first name"');
    expect(formatTsPropertyKey("2026-q1")).toBe('"2026-q1"');
  });

  it("infers primitive, nullable, union, and array property types across rows", () => {
    expect(inferTsPropertyType(["a", "b"])).toBe("string");
    expect(inferTsPropertyType([1, 2])).toBe("number");
    expect(inferTsPropertyType([true, false])).toBe("boolean");
    expect(inferTsPropertyType(["a", null])).toBe("string | null");
    expect(inferTsPropertyType(["a", 1, true, null])).toBe(
      "string | number | boolean | null"
    );
    expect(inferTsPropertyType([["x", "y"], ["z"]])).toBe("string[]");
    expect(inferTsPropertyType([[1, "a"]])).toBe("(string | number)[]");
    expect(inferTsPropertyType([null, undefined])).toBe("null");
  });

  it("emits export interface DataRow and typed data array", () => {
    const rows = [
      { id: 1, "full name": "Jack White", active: true, bio: null },
      { id: 2, "full name": "Meg White", active: false, bio: "drummer" },
    ];
    const ts = formatTypeScriptOutput(JSON.stringify(rows));
    expect(ts).toBe(
      [
        "export interface DataRow {",
        "  id: number;",
        '  "full name": string;',
        "  active: boolean;",
        "  bio: string | null;",
        "}",
        "",
        "export const data: DataRow[] = [",
        "  {",
        '    "id": 1,',
        '    "full name": "Jack White",',
        '    "active": true,',
        '    "bio": null',
        "  },",
        "  {",
        '    "id": 2,',
        '    "full name": "Meg White",',
        '    "active": false,',
        '    "bio": "drummer"',
        "  }",
        "];",
      ].join("\n")
    );
  });
});

describe("formatJsonLines & formatEgressOutput", () => {
  const sampleJson = JSON.stringify(
    [
      { album: "Elephant", year: 2003 },
      { album: "De Stijl", year: 2000 },
    ],
    null,
    2
  );

  it("returns raw JSON unchanged in 'json' mode", () => {
    expect(
      formatEgressOutput(sampleJson, "json", DEFAULT_OPTIONS, "albums.csv")
    ).toBe(sampleJson);
  });

  it("formats array-of-objects JSON into newline-delimited JSONL", () => {
    expect(
      formatEgressOutput(sampleJson, "jsonl", DEFAULT_OPTIONS, "albums.csv")
    ).toBe(
      '{"album":"Elephant","year":2003}\n{"album":"De Stijl","year":2000}'
    );
  });

  it("supports hash-mode JSON output across JSONL, SQL, and TS", () => {
    const hashJson = JSON.stringify(
      {
        Elephant: { year: 2003, US_peak_chart_post: 6 },
        "De Stijl": { year: 2000, US_peak_chart_post: null },
      },
      null,
      2
    );
    const hashOptions = { ...DEFAULT_OPTIONS, hash: true };

    expect(formatJsonLines(hashJson)).toBe(
      '{"key":"Elephant","year":2003,"US_peak_chart_post":6}\n{"key":"De Stijl","year":2000,"US_peak_chart_post":null}'
    );

    const rows = extractEgressRows(JSON.parse(hashJson));
    expect(rows).toEqual([
      { key: "Elephant", year: 2003, US_peak_chart_post: 6 },
      { key: "De Stijl", year: 2000, US_peak_chart_post: null },
    ]);

    const sql = formatEgressOutput(hashJson, "sql", hashOptions, "albums.csv");
    expect(sql).toContain('CREATE TABLE "albums"');
    expect(sql).toContain("('Elephant', 2003, 6)");

    const ts = formatEgressOutput(hashJson, "ts", hashOptions, "albums.csv");
    expect(ts).toContain("export interface DataRow {");
    expect(ts).toContain("US_peak_chart_post: number | null;");
  });
});
