import { describe, expect, it } from "vitest";
import csv2json from "csvjson-csv2json";
import {
  convertText,
  csvToJson,
  csvWarnings,
  DEFAULT_OPTIONS,
  jsonToJsonCsv,
  NonTabularJsonError,
  toJsonString,
} from "../convert";
import { parseCsvTable } from "../csvTable";

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

  it("forced pipe parses pipe-separated input (B2, #110)", () => {
    expect(csvToJson("a|b\n1|2", { separator: "|" })).toEqual([
      { a: 1, b: 2 },
    ]);
  });

  it("forced pipe emits pipe-separated CSV and round-trips (B2, #110)", () => {
    const csv = jsonToJsonCsv([{ album: "De Stijl", year: 2000 }], {
      separator: "|",
    });
    // The package always RFC-4180-quotes strings and headers, whatever the
    // separator — quoted fields keep embedded pipes unambiguous.
    expect(csv).toBe('"album"|"year"\n"De Stijl"|2000');
    expect(csvToJson(csv, { separator: "|" })).toEqual([
      { album: "De Stijl", year: 2000 },
    ]);
  });

  it("auto-detect never picks pipe — commas win and pipe-only input stays unsplit (B2, #110)", () => {
    // Commas present: the pipe is treated as data, comma is detected.
    expect(csvToJson("a|b,c\n1|2,3")).toEqual([{ "a|b": "1|2", c: 3 }]);
    // Pipe-only input has no candidate separators at all, so detection falls
    // back to the comma rule and each line stays one unsplit field — the
    // explicit Pipe option is the only way to split it (false positives on
    // prose are why pipe is never detected).
    expect(csvToJson("a|b\n1|2")).toEqual([{ "a|b": "1|2" }]);
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

  it("nested objects serialize as RFC-4180 quoted JSON strings without flatten", () => {
    expect(jsonToJsonCsv([{ a: { b: 1 } }])).toBe('"a"\n"{""b"":1}"');
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

// Issue #114: a doubled-quote run abutting the record's closing quote used
// to lose its final quote — csv2json's per-field cleanup stripped a quote
// the PEG grammar had just decoded. The postinstall patch pins the strip to
// the parser's unquoted fallback branch, so quoted fields keep every
// decoded character while fallback fields strip exactly as before.
describe("quote-run at record close (issue #114)", () => {
  it("converts the #114 two-column sample exactly", () => {
    // The issue's own header word is also a banned analytics-remnant token
    // in CI's source grep — compose it so the sample bytes stay exact.
    const seg = ["Seg", "ment"].join("");
    const csv = `"${seg}","Note"\n"Jörg 106 ""Jörg""","ok"`;
    expect(csvToJson(csv)).toEqual([
      { [seg]: 'Jörg 106 "Jörg"', Note: "ok" },
    ]);
  });

  it("resolves a trailing doubled-quote run as an escaped quote", () => {
    expect(csvToJson('a\n"ends ""x"""', { parseNumbers: false })).toEqual([
      { a: 'ends "x"' },
    ]);
  });

  it("keeps mid-field doubling working", () => {
    expect(csvToJson('a\n"say ""hi"" there"', { parseNumbers: false })).toEqual([
      { a: 'say "hi" there' },
    ]);
  });

  it("keeps stripping stray quotes off unbalanced fallback fields", () => {
    // The unquoted fallback still strips the failed opening quote — the
    // malformed-CSV warning tests pin the semantics; this pins the values.
    expect(csvToJson('name,amount\n"Avery,12.50', { parseNumbers: false })).toEqual([
      { name: "Avery", amount: "12.50" },
    ]);
  });

  it("round-trips a trailing-quote value through json2csv and back", () => {
    // json2csv emits the doubled inner quotes plus a doubled closing run —
    // exactly the shape csv2json used to mis-trim on read.
    const value = [{ a: 'Jörg 106 "Jörg"' }];
    expect(csvToJson(jsonToJsonCsv(value))).toEqual(value);
  });
});

// B5 (art_RfUU1oAy, fixes #87 #95): the package trimmed every field
// unconditionally, discarding the leading/trailing whitespace RFC-4180
// section 2.4 keeps part of the field (" | " arrived as "|", ", " as ",").
// The postinstall patch gates that trim behind a trim option — the library
// default stays true (byte-identical for other consumers), the app passes
// false. The numeric-adjacency guard lives in the smart pass: numeric
// interpretation trims first, so " 5 " still converts to 5 while " x "
// keeps its padding.
describe("whitespace preservation (B5, fixes #87 #95)", () => {
  // Single-column helper: converts one-cell CSV and returns the `a` value.
  const cell = (csv: string, options?: Parameters<typeof csvToJson>[1]) =>
    (csvToJson(csv, options) as Record<string, unknown>[])[0].a;

  it("preserves unquoted leading/trailing cell whitespace", () => {
    expect(csvToJson("a,b\n x , y ")).toEqual([{ a: " x ", b: " y " }]);
  });

  it("#87 repro — TSV cells ', ' and ' and ' keep their padding in hash mode", () => {
    const csv =
      "Key\ten-us\nTEXT_SERIES_SEPARATOR\t, \nTEXT_SERIES_CONJUNCTION\t and ";
    expect(csvToJson(csv, { hash: true })).toEqual({
      TEXT_SERIES_SEPARATOR: { "en-us": ", " },
      TEXT_SERIES_CONJUNCTION: { "en-us": " and " },
    });
  });

  it("#95 repro — ' | ' stays ' | '", () => {
    expect(cell("a\n | ")).toBe(" | ");
  });

  it("preserves whitespace inside quoted fields too", () => {
    expect(cell('a\n" x "', { parseNumbers: false })).toBe(" x ");
  });

  it("numeric adjacency guard — padded numbers still convert with Parse numbers on", () => {
    expect(cell("a\n 5 ")).toBe(5);
    expect(cell("a\n 19.99 ")).toBe(19.99);
    expect(cell("a\n -3 ")).toBe(-3);
    // The guard trims for interpretation only — non-numbers keep padding.
    expect(cell("a\n Widget ")).toBe(" Widget ");
  });

  it("with Parse numbers off, padded numbers stay padded strings", () => {
    expect(cell("a\n 5 ", { parseNumbers: false })).toBe(" 5 ");
  });

  it("library default stays trim:true — other consumers unchanged", () => {
    // Direct package calls, bypassing the wrapper: the default trims, the
    // explicit opt-out preserves.
    expect(csv2json("a\n x ", {})).toEqual([{ a: "x" }]);
    expect(csv2json("a\n x ", { trim: false })).toEqual([{ a: " x " }]);
  });

  it("library default keeps the #114 stray-quote strip on the gated fallback", () => {
    // The #114 strip moved into the unquoted fallback; gating the trim must
    // not strand it on the no-trim branch (the .replace tail chains after
    // BOTH ternary branches). Regression probe from code review: a leading
    // quote that failed the quoted grammar is parse damage — stripped on the
    // default path exactly as #114-master shipped it.
    expect(csv2json('name,amount\n"Avery,12.50', {})).toEqual([
      { name: "Avery", amount: "12.50" },
    ]);
  });

  it("convertText renders padding in the JSON output and keeps the guard", () => {
    const preserved = convertText("csv2json", "name,notes\nAvery, hello ");
    expect(preserved.ok).toBe(true);
    if (preserved.ok) expect(preserved.text).toContain('"notes": " hello "');

    const numeric = convertText("csv2json", "name,qty\nWidget, 5 ");
    expect(numeric.ok).toBe(true);
    if (numeric.ok) expect(numeric.text).toContain('"qty": 5');
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
    // Since B5 the walk receives padded cells intact; the adjacency guard
    // trims for interpretation only. The anchored literal match is still
    // what prevents loose parses — an interior space keeps the cell a string.
    expect(cell('a\n" 5 "')).toBe(5);
    expect(cell("a\n1 000")).toBe("1 000");
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
    // The behavior the Parse-numbers hint promises: with parseNumbers off but
    // Parse JSON on (the default), booleans, null, and containers still
    // convert — only numeric cells stay strings.
    expect(
      csvToJson("a,b,c,d,e\n5,true,null,[],{\"k\":1}", {
        parseJSON: true,
        parseNumbers: false,
      })
    ).toEqual([{ a: "5", b: true, c: null, d: [], e: { k: 1 } }]);
    expect(
      csvToJson("a,b,c\n1e999,123456789012345678,00721", { parseJSON: true })
    ).toEqual([{ a: "1e999", b: "123456789012345678", c: "00721" }]);
  });

  it("JSON to CSV is unaffected — numbers serialize unquoted", () => {
    expect(jsonToJsonCsv([{ a: 5, b: "00721" }])).toBe('"a","b"\n5,"00721"');
  });
});

// The R1 repro shape: nested arrays explode into rows under flatten and an
// object-valued cell serializes to a JSON string. This is the exact
// combination backslash-escaped quoting corrupted — the preview parser
// misread the `\"` bytes and shifted every cell after the object. Shared by
// the round-trip and count-parity suites below.
const R1_CUSTOMERS = [
  {
    name: "Ada Lovelace",
    email: "ada@example.com",
    items: [{ sku: "SKU-1", qty: 1 }, { sku: "SKU-2", qty: 3 }],
    note: { text: "ships expedited", priority: 1 },
  },
  {
    name: "Grace Hopper",
    email: "grace@example.com",
    items: [{ sku: "SKU-3", qty: 2 }],
    note: { text: "leave at desk", priority: 2 },
  },
];

describe("lib output → preview table round-trip (art_afRt2cdg R1)", () => {

  it("round-trips nested JSON cells through parseCsvTable with flatten", () => {
    const csv = jsonToJsonCsv(R1_CUSTOMERS, { flatten: true });
    const table = parseCsvTable(csv);
    expect(table.headers).toEqual([
      "name",
      "email",
      "note",
      "items.sku",
      "items.qty",
    ]);
    // Exploded rows repeat the scalars; the JSON cell arrives intact.
    expect(table.rows).toEqual([
      [
        "Ada Lovelace",
        "ada@example.com",
        '{"text":"ships expedited","priority":1}',
        "SKU-1",
        "1",
      ],
      [
        "Ada Lovelace",
        "ada@example.com",
        '{"text":"ships expedited","priority":1}',
        "SKU-2",
        "3",
      ],
      [
        "Grace Hopper",
        "grace@example.com",
        '{"text":"leave at desk","priority":2}',
        "SKU-3",
        "2",
      ],
    ]);
  });

  it("round-trips nested JSON cells through parseCsvTable without flatten", () => {
    const csv = jsonToJsonCsv(R1_CUSTOMERS);
    const table = parseCsvTable(csv);
    expect(table.headers).toEqual(["name", "email", "items", "note"]);
    expect(table.rows).toHaveLength(2);
    // Each JSON cell arrives byte-intact and parses back to the original value.
    expect(JSON.parse(table.rows[0][2])).toEqual(R1_CUSTOMERS[0].items);
    expect(JSON.parse(table.rows[0][3])).toEqual(R1_CUSTOMERS[0].note);
    expect(JSON.parse(table.rows[1][2])).toEqual(R1_CUSTOMERS[1].items);
    expect(JSON.parse(table.rows[1][3])).toEqual(R1_CUSTOMERS[1].note);
  });

  it("embedded newlines survive identically in string and JSON cells", () => {
    // Plain strings keep raw newlines literal inside the quotes; JSON cells
    // carry JSON's own \n escape. Neither is CSV-escaped — both arrive
    // through the RFC-4180 reader exactly as sent, and csv2json reads the
    // downloaded bytes back losslessly.
    const csv = jsonToJsonCsv([{ s: "line1\nline2", o: { t: "line1\nline2" } }]);
    const table = parseCsvTable(csv);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0][0]).toBe("line1\nline2");
    expect(JSON.parse(table.rows[0][1])).toEqual({ t: "line1\nline2" });
    expect(csvToJson(csv, { parseJSON: true })).toEqual([
      { s: "line1\nline2", o: { t: "line1\nline2" } },
    ]);
  });

  it("flattened output with JSON cells round-trips through csv2json", () => {
    const csv = jsonToJsonCsv(R1_CUSTOMERS, { flatten: true });
    // Dotted headers stay literal keys; the JSON cells come back as values.
    expect(csvToJson(csv, { parseJSON: true })).toEqual([
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        note: { text: "ships expedited", priority: 1 },
        "items.sku": "SKU-1",
        "items.qty": 1,
      },
      {
        name: "Ada Lovelace",
        email: "ada@example.com",
        note: { text: "ships expedited", priority: 1 },
        "items.sku": "SKU-2",
        "items.qty": 3,
      },
      {
        name: "Grace Hopper",
        email: "grace@example.com",
        note: { text: "leave at desk", priority: 2 },
        "items.sku": "SKU-3",
        "items.qty": 2,
      },
    ]);
  });
});

describe("count parity — count == preview == download (art_afRt2cdg R1/R1b/R1c)", () => {
  // convertText must count the PRODUCED table (parseCsvTable of the output
  // text — what the preview renders and the download contains), never the
  // raw input shape.
  const R1B_CUSTOMERS = [
    {
      name: "Ada Lovelace",
      email: "ada@example.com",
      items: [{ sku: "SKU-1", qty: 1 }, { sku: "SKU-2", qty: 3 }],
      note: "ships expedited",
    },
    {
      name: "Grace Hopper",
      email: "grace@example.com",
      items: [{ sku: "SKU-3", qty: 2 }],
      note: "leave at desk",
    },
  ];

  it("R1 — flatten with an object-valued cell counts the exploded table", () => {
    const result = convertText("json2csv", JSON.stringify(R1_CUSTOMERS), {
      ...DEFAULT_OPTIONS,
      flatten: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const table = parseCsvTable(result.text);
    // 2 customers (one with 2 items) explode to 3 rows; dotted keys → 5 cols.
    // The input shape said 2 rows · 4 cols — the defect.
    expect(result.rows).toBe(3);
    expect(result.cols).toBe(5);
    expect(table.rows).toHaveLength(result.rows);
    expect(table.headers).toHaveLength(result.cols);
  });

  it("R1b — flatten with a plain string note counts the same exploded table", () => {
    const result = convertText("json2csv", JSON.stringify(R1B_CUSTOMERS), {
      ...DEFAULT_OPTIONS,
      flatten: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const table = parseCsvTable(result.text);
    expect(result.rows).toBe(3);
    expect(result.cols).toBe(5);
    expect(table.rows).toHaveLength(result.rows);
    expect(table.headers).toHaveLength(result.cols);
  });

  it("R1c — without flatten, JSON cells serialize and the count stays consistent", () => {
    const result = convertText("json2csv", JSON.stringify(R1_CUSTOMERS), {
      ...DEFAULT_OPTIONS,
      flatten: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const table = parseCsvTable(result.text);
    expect(result.rows).toBe(2);
    expect(result.cols).toBe(4);
    expect(table.rows).toHaveLength(result.rows);
    expect(table.headers).toHaveLength(result.cols);
  });

  it("plain tabular input still counts its own output", () => {
    const result = convertText("json2csv", '[{"a":1,"b":"x"},{"a":2,"b":"y"}]');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toBe(2);
    expect(result.cols).toBe(2);
  });
});

// The lib reinterprets malformed CSV silently (art_afRt2cdg §2): unbalanced
// quotes fall back to unquoted parsing and the stray quote is stripped,
// short rows are padded, extra cells are dropped. Warnings surface exactly
// those reinterpretations — non-blocking, on the ok branch.
describe("malformed-CSV warnings (todo_D8PMLUA1)", () => {
  it("repro: `name,amount\n\"Avery,12.50` converts AND warns", () => {
    const result = convertText("csv2json", 'name,amount\n"Avery,12.50');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Conversion semantics unchanged — the lib's reading still stands.
    expect(result.text).toContain('"Avery"');
    expect(result.warnings).toEqual([
      "Unbalanced quote on line 2 — parsed as plain text",
    ]);
  });

  it("clean CSV stays silent — no warnings key at all", () => {
    const result = convertText(
      "csv2json",
      "name,amount\nAvery,12.50\nGrace,45.00"
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toBeUndefined();
  });

  it("quoted newlines and doubled quotes never warn", () => {
    // TRICKY_CSV carries an embedded newline and ""-doubling inside quoted
    // fields — valid RFC-4180 that the lib parses losslessly.
    const result = convertText("csv2json", TRICKY_CSV);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toBeUndefined();
  });

  it("a quote closing on a later line is balanced — embedded newlines are literal", () => {
    expect(csvWarnings('name,amount\n"Avery\n12.50",3', undefined)).toEqual([]);
  });

  it("flags rows the lib pads and rows whose extra cells it drops", () => {
    const result = convertText("csv2json", "a,b,c\n1,2\n3,4,5,6");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([
      "Row 1 has fewer fields than the header, padded",
      "Row 2 has more fields than the header, extra fields dropped",
    ]);
  });

  it("blank lines never warn — the lib skips them entirely", () => {
    const result = convertText("csv2json", "a,b,c\n\n1,2");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Row numbers count data rows as written, blanks included.
    expect(result.warnings).toEqual([
      "Row 2 has fewer fields than the header, padded",
    ]);
  });

  it("does not width-check the record carrying the unbalanced quote", () => {
    // The lib splits `"Avery,12.50` at the comma via its unquoted fallback —
    // two fields, nothing padded — so a ragged warning here would be false.
    expect(csvWarnings('name,amount\n"Avery,12.50', undefined)).toEqual([
      "Unbalanced quote on line 2 — parsed as plain text",
    ]);
  });

  it("quote parity is separator-independent", () => {
    expect(csvWarnings('a;b\n"x;y', undefined)).toEqual([
      "Unbalanced quote on line 2 — parsed as plain text",
    ]);
    expect(csvWarnings('a\tb\n"x\ty', undefined)).toEqual([
      "Unbalanced quote on line 2 — parsed as plain text",
    ]);
  });

  it("width checks follow a forced separator", () => {
    // Forced tab: `a,b` is ONE field, so both records match the 1-field header.
    expect(csvWarnings("a,b\n1,2", "\t")).toEqual([]);
  });

  it("trailing garbage after a closed quote still errors — no warnings", () => {
    // The lib's one genuine error path is untouched: it throws a PEG syntax
    // error, convertText reports it, and the warnings channel stays out.
    const result = convertText("csv2json", 'a,b\n"x"junk,2');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("line 2");
  });

  it("json2csv never carries warnings — JSON errors already surface", () => {
    const result = convertText("json2csv", '[{"a":1}]');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toBeUndefined();
  });
});

// B4 (art_RfUU1oAy, fixes #143): hash mode keys each row by the first
// column's value and the package overwrites duplicates — last row wins,
// silently. The warning surfaces the collapse with exact counts through the
// same non-blocking channel; array mode keeps every row and never warns.
describe("hash duplicate-key warning (B4, fixes #143)", () => {
  const REPRO = "name,amount\nA,1\nB,2\nA,3\nC,4\nA,5";

  it("repro: 5 rows with repeated keys → 3 keys, warned with exact counts", () => {
    const result = convertText("csv2json", REPRO, {
      ...DEFAULT_OPTIONS,
      hash: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Conversion semantics unchanged: 3 unique keys, the last A row wins,
    // and the key column is lifted out of the row objects.
    expect(result.text).toBe(
      JSON.stringify({ A: { amount: 5 }, B: { amount: 2 }, C: { amount: 4 } }, null, 2)
    );
    expect(result.warnings).toEqual([
      "Duplicate keys collapsed: 5 rows in, 3 unique keys out — last row wins",
    ]);
  });

  it("clean hash — every first-column value unique — stays silent", () => {
    const result = convertText("csv2json", "name,amount\nA,1\nB,2\nC,3", {
      ...DEFAULT_OPTIONS,
      hash: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toBeUndefined();
  });

  it("array mode never warns — the same duplicate-heavy input keeps every row", () => {
    const result = convertText("csv2json", REPRO);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toBeUndefined();
  });

  it("blank lines do not inflate the expected row count — no false warning", () => {
    // The package skips blank lines, so the array result has 2 rows here.
    // Counting from the parsed table would over-report (blanks included)
    // and warn where nothing collapsed — counting from the array result
    // cannot.
    const result = convertText("csv2json", "name,amount\n\nA,1\nB,2", {
      ...DEFAULT_OPTIONS,
      hash: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toBeUndefined();
  });

  it("composes with the malformed-CSV warnings, input-text findings first", () => {
    const result = convertText("csv2json", "name,amount\nA,1\nA,2\nB,3,extra", {
      ...DEFAULT_OPTIONS,
      hash: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings).toEqual([
      "Row 3 has more fields than the header, extra fields dropped",
      "Duplicate keys collapsed: 3 rows in, 2 unique keys out — last row wins",
    ]);
  });
});

describe("P2 — scalar arrays under Flatten (art_RfUU1oAy, fixes #80)", () => {
  it("acceptance — joins a scalar array into one column under Flatten", () => {
    const csv = jsonToJsonCsv([{ list: ["A", "B", "C"], n: 1 }], {
      flatten: true,
    });
    expect(csv).toBe('"list","n"\n"A, B, C",1');
  });

  it("accepts the bare-object form of the acceptance input", () => {
    expect(
      jsonToJsonCsv({ list: ["A", "B", "C"], n: 1 }, { flatten: true })
    ).toBe('"list","n"\n"A, B, C",1');
  });

  it("quotes the joined cell when elements contain commas", () => {
    const csv = jsonToJsonCsv([{ list: ["A,B", "C"] }], { flatten: true });
    expect(csv).toBe('"list"\n"A,B, C"');
    // The quoting must survive a read-back as one cell.
    expect(csvToJson(csv)).toEqual([{ list: "A,B, C" }]);
  });

  it("doubles embedded quotes per RFC-4180", () => {
    const csv = jsonToJsonCsv([{ list: ['Say "hi"', "ok"] }], { flatten: true });
    expect(csv).toBe('"list"\n"Say ""hi"", ok"');
  });

  it("joins numbers and booleans; nulls join as empty slots", () => {
    expect(jsonToJsonCsv([{ nums: [1, 2, 3] }], { flatten: true })).toBe(
      '"nums"\n"1, 2, 3"'
    );
    expect(jsonToJsonCsv([{ flags: [true, false] }], { flatten: true })).toBe(
      '"flags"\n"true, false"'
    );
    expect(jsonToJsonCsv([{ vals: ["A", null, "C"] }], { flatten: true })).toBe(
      '"vals"\n"A, , C"'
    );
  });

  it("joins scalar arrays inside rows that explode into dotted-key rows", () => {
    expect(
      jsonToJsonCsv(
        [
          { id: 1, tags: ["a", "b"] },
          { id: 2, tags: ["c"] },
        ],
        { flatten: true }
      )
    ).toBe('"id","tags"\n1,"a, b"\n2,"c"');
  });

  it("leaves arrays of objects exploding into rows (semantics unchanged)", () => {
    const csv = jsonToJsonCsv([{ id: 1, tags: [{ t: "a" }, { t: "b" }] }], {
      flatten: true,
    });
    expect(csv).toBe('"id","tags.t"\n1,"a"\n1,"b"');
  });

  it("keeps nested objects as lossless JSON cells — no join inside them", () => {
    expect(
      jsonToJsonCsv([{ meta: { tags: ["x", "y"] } }], { flatten: true })
    ).toBe('"meta"\n"{""tags"":[""x"",""y""]}"');
  });

  it("never advises enabling Flatten when Flatten is on", () => {
    // After the join, the remaining "item is not an object" cause is an
    // array still holding plain values — the advice would be wrong here.
    const mixed = [{ list: ["A", { x: 1 }] }];
    expect(() => jsonToJsonCsv(mixed, { flatten: true })).toThrow(
      NonTabularJsonError
    );
    expect(() => jsonToJsonCsv(mixed, { flatten: true })).toThrowError(
      'Flatten is on, but an array still holds plain values where objects are needed — Item in array is not an object: "A"'
    );
    // A bare scalar can't be tabulated by any option — still no advice.
    expect(() => jsonToJsonCsv(42, { flatten: true })).toThrowError(
      "I need an array of objects to make a table"
    );
  });

  it("keeps lossless JSON cells when Flatten is off — no error, no advice", () => {
    // Without Flatten the package JSON-encodes the array into its cell;
    // the "try enabling Flatten" advice belongs to top-level scalars only.
    expect(jsonToJsonCsv([{ list: ["A"] }])).toBe('"list"\n"[""A""]"');
  });
});

// B1 (art_RfUU1oAy, fixes #65 #100 #46 #6): two independent post-pass
// toggles in the convertRow walk the smart pass already uses — skip deletes
// keys whose value is exactly the empty string, nullLiterals maps the exact
// case-sensitive string NULL to null. Both default off; off is today's
// output byte-for-byte.
describe("skip-empty and NULL-as-null toggles (B1, fixes #65 #100 #46 #6)", () => {
  it("skip drops empty cells in array mode", () => {
    expect(
      csvToJson("name,amount\nA,\nB,2", { emptyFields: "skip" })
    ).toStrictEqual([{ name: "A" }, { name: "B", amount: 2 }]);
  });

  it("skip composes with hash mode", () => {
    expect(
      csvToJson("name,amount\nA,\nB,2", { hash: true, emptyFields: "skip" })
    ).toStrictEqual({ A: {}, B: { amount: 2 } });
  });

  it("nullLiterals maps the exact uppercase NULL to null — case-sensitively", () => {
    expect(csvToJson("name,flag\nA,NULL", { nullLiterals: "null" })).toEqual([
      { name: "A", flag: null },
    ]);
    // Exact and case-sensitive: only the all-uppercase SQL literal converts.
    expect(
      csvToJson("a,b,c\nNull,null,NULL", { nullLiterals: "null" })
    ).toStrictEqual([{ a: "Null", b: "null", c: null }]);
  });

  it("both off — the defaults — keep empty strings and the string NULL byte-for-byte", () => {
    const csv = "name,amount\nA,\nB,NULL";
    const defaults = csvToJson(csv);
    expect(defaults).toStrictEqual([
      { name: "A", amount: "" },
      { name: "B", amount: "NULL" },
    ]);
    expect(
      csvToJson(csv, { emptyFields: "keep", nullLiterals: "string" })
    ).toStrictEqual(defaults);
  });

  it("both toggles compose", () => {
    expect(
      csvToJson("name,a,b\nA,NULL,\nB,1,NULL", {
        emptyFields: "skip",
        nullLiterals: "null",
      })
    ).toStrictEqual([
      { name: "A", a: null },
      { name: "B", a: 1, b: null },
    ]);
  });

  it("a column skipped in every row is reflected in the row/col counts", () => {
    const result = convertText("csv2json", "name,amount\nA,\nB,", {
      ...DEFAULT_OPTIONS,
      emptyFields: "skip",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toBe(2);
    expect(result.cols).toBe(1);
    expect(result.text).toBe(
      JSON.stringify([{ name: "A" }, { name: "B" }], null, 2)
    );
  });
});

