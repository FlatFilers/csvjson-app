import { describe, expect, it } from "vitest";
import {
  convertText,
  csvToJson,
  jsonToJsonCsv,
  NonTabularJsonError,
  toJsonString,
} from "../convert";

const TRICKY_CSV = [
  "name,notes,quote",
  '"De Stijl",2000,"has, comma"',
  '"White Blood Cells",2001,"with ""quotes"" and',
  'newline"',
  "Ünïcødé,1,\"éèê\"",
].join("\n");

describe("round-trip fidelity (criterion 1)", () => {
  it("preserves data across CSV → JSON → CSV", () => {
    const json = csvToJson(TRICKY_CSV);
    const back = jsonToJsonCsv(json);
    expect(csvToJson(back)).toEqual(json);
  });

  it("round-trips TSV input", () => {
    const json = csvToJson("album\tyear\nDe Stijl\t2000\nElephant\t2003");
    expect(json).toEqual([
      { album: "De Stijl", year: 2000 },
      { album: "Elephant", year: 2003 },
    ]);
  });

  it("round-trips semicolon-separated input", () => {
    const json = csvToJson("album;year\nDe Stijl;2000");
    expect(json).toEqual([{ album: "De Stijl", year: 2000 }]);
  });

  it("round-trips unicode and accented text", () => {
    const csv = "album,artist\nÜnïcødé,Sigur Rós\n日本語,проба\nÉmoji 🎉,ok";
    const json = csvToJson(csv);
    expect(csvToJson(jsonToJsonCsv(json))).toEqual(json);
  });
});

describe("per-option behavior (criterion 2)", () => {
  it("auto-detects comma, semicolon, and tab separators", () => {
    expect(csvToJson("a,b\n1,2")).toEqual([{ a: 1, b: 2 }]);
    expect(csvToJson("a;b\n1;2")).toEqual([{ a: 1, b: 2 }]);
    expect(csvToJson("a\tb\n1\t2")).toEqual([{ a: 1, b: 2 }]);
  });

  it("forced separator overrides auto-detection", () => {
    expect(csvToJson("a;b\n1;2", { separator: "," })).toEqual([
      { "a;b": "1;2" },
    ]);
    expect(csvToJson("a,b\n1,2", { separator: "\t" })).toEqual([
      { "a,b": "1,2" },
    ]);
  });

  it("parseNumbers keeps leading zeros but parses plain numbers", () => {
    expect(csvToJson("a\n00721\n7\n1.5", { parseNumbers: true })).toEqual([
      { a: "00721" },
      { a: 7 },
      { a: 1.5 },
    ]);
  });

  it("parseNumbers is on by default — plain numbers convert, leading zeros stay", () => {
    expect(csvToJson("a\n7\n00721")).toEqual([{ a: 7 }, { a: "00721" }]);
  });

  it("parseJSON is the only source of null, true, false, [], {}", () => {
    expect(
      csvToJson("a,b,c,d,e\nnull,true,false,[],{}", { parseJSON: true })
    ).toEqual([{ a: null, b: true, c: false, d: [], e: {} }]);
    // without the option the same cells stay strings
    expect(csvToJson("a,b\nnull,true")).toEqual([
      { a: "null", b: "true" },
    ]);
  });

  it("transpose pivots rows into columns", () => {
    expect(csvToJson("a,b\n1,2\n3,4", { transpose: true })).toEqual([
      { a: "b", "1": 2, "3": 4 },
    ]);
  });

  it("hash uses the first column as the object key", () => {
    expect(csvToJson("name,age\nA,1\nB,2", { hash: true })).toEqual({
      A: { age: 1 },
      B: { age: 2 },
    });
  });

  it("minify serializes compact JSON without touching the data", () => {
    const json = csvToJson("a,b\n1,2");
    expect(toJsonString(json, { minify: true })).toBe('[{"a":1,"b":2}]');
    expect(toJsonString(json)).toBe(
      '[\n  {\n    "a": 1,\n    "b": 2\n  }\n]'
    );
  });

  it("flatten emits dotted keys and extra rows for nested arrays of objects", () => {
    const csv = jsonToJsonCsv([{ id: 1, tags: [{ t: "a" }, { t: "b" }] }], {
      flatten: true,
    });
    expect(csv).toBe('"id","tags.t"\n1,"a"\n1,"b"');
  });

  it("nested objects serialize as JSON strings without flatten", () => {
    expect(jsonToJsonCsv([{ a: { b: 1 } }])).toBe('"a"\n"{\\"b\\":1}"');
  });
});

describe("edge cases (criterion 11)", () => {
  it("pads short rows with empty cells and drops extra cells", () => {
    expect(csvToJson("a,b,c\n1,2\n3,4,5,6")).toEqual([
      { a: 1, b: 2, c: "" },
      { a: 3, b: 4, c: 5 },
    ]);
  });

  it("uniquifies duplicate headers with a __1 suffix", () => {
    expect(csvToJson("name,age,name\nA,1,B\nC,2,D")).toEqual([
      { name: "A", age: 1, name__1: "B" },
      { name: "C", age: 2, name__1: "D" },
    ]);
  });

  it("uniquifies triple duplicate headers with incrementing suffixes", () => {
    expect(csvToJson("a,a,a\n1,2,3")).toEqual([
      { a: 1, a__1: 2, a__2: 3 },
    ]);
  });

  it("keeps empty cells as empty strings — never null", () => {
    expect(csvToJson("a,b\n1,")).toEqual([{ a: 1, b: "" }]);
  });

  it("strips a UTF-8 BOM before parsing", () => {
    expect(csvToJson("\uFEFFa,b\n1,2")).toEqual([{ a: 1, b: 2 }]);
  });

  it("accepts CRLF, LF, and mixed line endings", () => {
    expect(csvToJson("a,b\r\n1,2\r\n3,4\n")).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: 4 },
    ]);
  });

  it("errors on non-tabular JSON with the spec's message", () => {
    for (const data of [42, "hello", [1, 2, 3], null, undefined]) {
      expect(() => jsonToJsonCsv(data)).toThrow(NonTabularJsonError);
      expect(() => jsonToJsonCsv(data)).toThrowError(
        "I need an array of objects — try enabling Flatten"
      );
    }
  });

  it("allows a top-level object as tabular JSON", () => {
    expect(jsonToJsonCsv({ a: 1 })).toBe('"a"\n1');
  });

  it("rethrows other package failures as real Errors", () => {
    // a thrown primitive string must NOT satisfy this — callers rely on e.message
    expect(() => csvToJson("")).toThrowError(Error);
    expect(() => csvToJson("")).toThrowError(
      "Empty CSV. Please provide something."
    );
  });
});

describe("smart parse-numbers default (todo_PtV57hBw)", () => {
  // Single-column helper: converts one-cell CSV and returns the `a` value.
  const cell = (csv: string, options?: Parameters<typeof csvToJson>[1]) =>
    (csvToJson(csv, options) as Record<string, unknown>[])[0].a;

  it("converts plain number literals to JSON numbers", () => {
    expect(cell("a\n5")).toBe(5);
    expect(cell("a\n19.99")).toBe(19.99);
    expect(cell("a\n-3")).toBe(-3);
    expect(cell("a\n1e5")).toBe(100000);
    expect(cell("a\n0")).toBe(0);
    expect(cell("a\n0.5")).toBe(0.5);
  });

  it("keeps leading zeros, long IDs, and non-numbers as strings", () => {
    expect(cell("a\n00721")).toBe("00721");
    expect(cell("a\n007")).toBe("007");
    expect(cell("a\n123456789012345678")).toBe("123456789012345678");
    expect(cell("a\n9007199254740993")).toBe("9007199254740993"); // 2^53 + 1
    expect(cell("a\n9007199254740992")).toBe("9007199254740992"); // 2^53 — not safe
    expect(cell("a\nWidget")).toBe("Widget");
    expect(cell('a\n"1,000"')).toBe("1,000"); // quoted — a bare comma would be a separator
    expect(cell("a\n1 000")).toBe("1 000");
    expect(csvToJson("a,b\n,")).toEqual([{ a: "", b: "" }]);
  });

  it("never emits non-finite numbers — 1e999 stays a string, not null", () => {
    // The package's own JSON.parse coercion turned this into Infinity, which
    // serialized as null — a data-corruption regression guard.
    expect(cell("a\n1e999")).toBe("1e999");
  });

  it("applies the smart rule to the parser's delivered value — never a loose parse", () => {
    // The package parser trims cells before the walk, so a padded cell
    // arrives as "5" and converts. The anchored literal match is what
    // prevents loose parses — the walk itself never accepts surrounding
    // whitespace (a parser that preserves padding would keep it a string).
    expect(cell('a\n" 5 "')).toBe(5);
  });

  it("default conversion (no options) produces numbers", () => {
    expect(csvToJson("name,qty,price,zip\nWidget,5,19.99,00721")).toEqual([
      { name: "Widget", qty: 5, price: 19.99, zip: "00721" },
    ]);
    const result = convertText("csv2json", "name,qty\nWidget,5");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.text).toContain('"qty": 5');
  });

  it("explicit {parseNumbers: false} keeps every cell a string", () => {
    expect(csvToJson("a,b,c\n5,19.99,00721", { parseNumbers: false })).toEqual(
      [{ a: "5", b: "19.99", c: "00721" }]
    );
  });

  it("Parse JSON never produces numbers — they belong to parse-numbers", () => {
    expect(
      csvToJson("a,b\n5,true", { parseJSON: true, parseNumbers: false })
    ).toEqual([{ a: "5", b: true }]);
    expect(
      csvToJson("a,b,c\n1e999,123456789012345678,00721", { parseJSON: true })
    ).toEqual([{ a: "1e999", b: "123456789012345678", c: "00721" }]);
  });

  it("JSON to CSV is unaffected — numbers serialize unquoted", () => {
    expect(jsonToJsonCsv([{ a: 5, b: "00721" }])).toBe('"a","b"\n5,"00721"');
  });
});
