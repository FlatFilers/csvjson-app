import { describe, expect, it } from "vitest";
import {
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
      { album: "De Stijl", year: "2000" },
      { album: "Elephant", year: "2003" },
    ]);
  });

  it("round-trips semicolon-separated input", () => {
    const json = csvToJson("album;year\nDe Stijl;2000");
    expect(json).toEqual([{ album: "De Stijl", year: "2000" }]);
  });

  it("round-trips unicode and accented text", () => {
    const csv = "album,artist\nÜnïcødé,Sigur Rós\n日本語,проба\nÉmoji 🎉,ok";
    const json = csvToJson(csv);
    expect(csvToJson(jsonToJsonCsv(json))).toEqual(json);
  });
});

describe("per-option behavior (criterion 2)", () => {
  it("auto-detects comma, semicolon, and tab separators", () => {
    expect(csvToJson("a,b\n1,2")).toEqual([{ a: "1", b: "2" }]);
    expect(csvToJson("a;b\n1;2")).toEqual([{ a: "1", b: "2" }]);
    expect(csvToJson("a\tb\n1\t2")).toEqual([{ a: "1", b: "2" }]);
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

  it("parseNumbers is off by default", () => {
    expect(csvToJson("a\n7\n00721")).toEqual([{ a: "7" }, { a: "00721" }]);
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
      { a: "b", "1": "2", "3": "4" },
    ]);
  });

  it("hash uses the first column as the object key", () => {
    expect(csvToJson("name,age\nA,1\nB,2", { hash: true })).toEqual({
      A: { age: "1" },
      B: { age: "2" },
    });
  });

  it("minify serializes compact JSON without touching the data", () => {
    const json = csvToJson("a,b\n1,2");
    expect(toJsonString(json, { minify: true })).toBe('[{"a":"1","b":"2"}]');
    expect(toJsonString(json)).toBe(
      '[\n  {\n    "a": "1",\n    "b": "2"\n  }\n]'
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
      { a: "1", b: "2", c: "" },
      { a: "3", b: "4", c: "5" },
    ]);
  });

  it("uniquifies duplicate headers with a __1 suffix", () => {
    expect(csvToJson("name,age,name\nA,1,B\nC,2,D")).toEqual([
      { name: "A", age: "1", name__1: "B" },
      { name: "C", age: "2", name__1: "D" },
    ]);
  });

  it("uniquifies triple duplicate headers with incrementing suffixes", () => {
    expect(csvToJson("a,a,a\n1,2,3")).toEqual([
      { a: "1", a__1: "2", a__2: "3" },
    ]);
  });

  it("keeps empty cells as empty strings — never null", () => {
    expect(csvToJson("a,b\n1,")).toEqual([{ a: "1", b: "" }]);
  });

  it("strips a UTF-8 BOM before parsing", () => {
    expect(csvToJson("\uFEFFa,b\n1,2")).toEqual([{ a: "1", b: "2" }]);
  });

  it("accepts CRLF, LF, and mixed line endings", () => {
    expect(csvToJson("a,b\r\n1,2\r\n3,4\n")).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
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
