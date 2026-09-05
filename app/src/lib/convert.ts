import csv2json from "csvjson-csv2json";
import json2csv from "csvjson-json2csv";
import { parseCsvTable } from "./csvTable";

/**
 * Typed wrapper over the csvjson conversion packages. The packages are
 * dependency-free CommonJS with no types and no runnable tests (see the
 * spec's Representative interfaces) — CSV/JSON table parsing stays in them;
 * this module adds the typed surface, BOM stripping, normalized errors, and
 * the smart parse-numbers / parse-JSON value pass (the packages' own value
 * coercion violates the smart contract — see csvToJson).
 */

export type Csv2JsonOptions = {
  /** omitted → auto-detect over , ; \t */
  separator?: "," | ";" | "\t";
  /**
   * Smart number parsing — on by default. A cell becomes a JSON number only
   * when it is a full JSON number literal (no surrounding whitespace), has
   * no leading zeros in the integer part, is finite, and — when an integer —
   * satisfies Number.isSafeInteger. `false` keeps every cell a string.
   */
  parseNumbers?: boolean;
  /**
   * Turns JSON literals (null, true, false, [], {} and nested JSON) into real
   * values. Never produces numbers — numbers belong to parseNumbers.
   */
  parseJSON?: boolean;
  transpose?: boolean;
  hash?: boolean; // first column becomes the object key
};

export type Json2CsvOptions = {
  separator?: "," | ";" | "\t";
  /**
   * Arrays of objects explode into extra rows with dotted keys; scalar
   * arrays join into a single column, elements separated by ", " (P2,
   * art_RfUU1oAy).
   */
  flatten?: boolean;
};

/** Thrown when JSON→CSV receives non-tabular JSON (scalar or array of scalars). */
export class NonTabularJsonError extends Error {
  constructor(message = "I need an array of objects — try enabling Flatten") {
    super(message);
    this.name = "NonTabularJsonError";
  }
}

/**
 * The wrapper message for a non-tabular input. With Flatten off the fix is
 * to enable it; with Flatten on that advice would be wrong (P2, art_RfUU1oAy)
 * — after the scalar-array join, the remaining "item is not an object" cause
 * is an array still holding plain values where the package needs objects,
 * and a bare scalar is untabulable by any option. The package's own detail
 * (it names the offending value) is kept so the error stays actionable.
 */
function nonTabularMessage(packageMessage: string, flatten: boolean): string {
  if (!flatten) return "I need an array of objects — try enabling Flatten";
  if (packageMessage.startsWith("Item in array is not an object:")) {
    return `Flatten is on, but an array still holds plain values where objects are needed — ${packageMessage}`;
  }
  return "I need an array of objects to make a table";
}

// The packages throw plain strings, not Error instances.
const NON_TABULAR_PATTERNS = [
  "Your JSON must be an array or an object.",
  "Item in array is not an object:",
];

function unwrapErrorMessage(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}

const UTF8_BOM = "\uFEFF";

/**
 * Full-string JSON number literal: optional minus sign, an integer part with
 * no leading zeros (a lone 0 is allowed), optional fraction and exponent.
 * Anchored, so surrounding whitespace, thousands separators, or padding
 * never match.
 */
const JSON_NUMBER_LITERAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

/**
 * The smart parse-numbers rule. A value becomes a JSON number only when ALL
 * hold, else it stays a string:
 *   1. full-string match of a JSON number literal — no surrounding whitespace;
 *   2. no leading zeros in the integer part ("00721" stays a string);
 *   3. an integer result satisfies Number.isSafeInteger (long IDs stay strings);
 *   4. the result is finite ("1e999" stays a string).
 */
function toSmartNumber(value: string): string | number {
  if (!JSON_NUMBER_LITERAL.test(value)) return value;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return value;
  if (Number.isInteger(parsed) && !Number.isSafeInteger(parsed)) return value;
  return parsed;
}

function tryParseJsonLiteral(
  value: string
): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** JSON scalar: string, number, boolean, or null. */
type JsonScalar = string | number | boolean | null;

function isJsonScalar(value: unknown): value is JsonScalar {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * P2 (art_RfUU1oAy, fixes #80): under Flatten, a non-empty array of JSON
 * scalars serializes as a single column named after its key, elements
 * joined by ", " — the CSV writer then quotes the cell correctly when
 * elements contain commas. Joining wins over JSON-encoding the array on
 * reporter intent: the values should read naturally in Excel. Elements
 * render like the writer itself would render them: strings as-is, numbers
 * and booleans via String, nulls as empty slots (matching its null →
 * empty-cell rendering) — Array.prototype.join's own semantics.
 *
 * The walk covers exactly the shapes the package's flatten touches: the
 * top-level record (it wraps one in a single-element array) and the
 * elements of arrays, which explode into rows under dotted keys. Plain
 * object values are NOT entered — the package JSON-encodes them into their
 * cell, and joining inside would make that JSON lossy.
 *
 * Everything else passes through untouched: empty arrays (the package
 * already drops the column), arrays of objects (explode-into-rows
 * semantics), and mixed arrays (left for the package's own error, routed
 * to a flatten-aware NonTabularJsonError).
 */
function joinScalarArrays(data: unknown): unknown {
  const joinRow = (row: unknown): unknown => {
    if (!isRecord(row)) return row;
    const joined: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (
        Array.isArray(value) &&
        value.length > 0 &&
        value.every(isJsonScalar)
      ) {
        joined[key] = value.join(", ");
      } else if (Array.isArray(value)) {
        // An array of objects explodes into rows — walk its elements.
        joined[key] = value.map(joinRow);
      } else {
        joined[key] = value;
      }
    }
    return joined;
  };
  if (Array.isArray(data)) return data.map(joinRow);
  if (isRecord(data)) return joinRow(data);
  return data;
}

/**
 * One cell of the parsed CSV. Parse JSON keeps its semantics for non-number
 * literals (null, true, false, [], {} and nested JSON) but never produces
 * numbers — numbers belong to the parse-numbers rule, whose smart contract
 * the package's own JSON.parse would violate (it coerces "1e999" into
 * Infinity and long IDs with precision loss before a wrapper could see the
 * strings).
 */
function smartCellValue(
  value: string,
  parseJSON: boolean,
  parseNumbers: boolean
): unknown {
  if (parseJSON) {
    const parsed = tryParseJsonLiteral(value);
    if (parsed.ok && typeof parsed.value !== "number") return parsed.value;
  }
  if (parseNumbers) return toSmartNumber(value);
  return value;
}

/**
 * Applies smartCellValue to every cell of the package's output. The package
 * returns either an array of records, or — with hash — an object whose
 * values are records; keys are never touched.
 */
function applySmartValues(
  json: Record<string, unknown>[] | Record<string, unknown>,
  parseJSON: boolean,
  parseNumbers: boolean
): Record<string, unknown>[] | Record<string, unknown> {
  const convertRow = (row: Record<string, unknown>): Record<string, unknown> => {
    const converted: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      const value = row[key];
      converted[key] =
        typeof value === "string"
          ? smartCellValue(value, parseJSON, parseNumbers)
          : value;
    }
    return converted;
  };
  if (Array.isArray(json)) {
    return json.map((row) => (isRecord(row) ? convertRow(row) : row));
  }
  const converted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(json)) {
    converted[key] = isRecord(value) ? convertRow(value) : value;
  }
  return converted;
}

export function csvToJson(
  csv: string,
  options: Csv2JsonOptions = {}
): Record<string, unknown>[] | Record<string, unknown> {
  // Smart parse-numbers defaults on; explicit false restores all-strings.
  const parseNumbers = options.parseNumbers ?? true;
  const parseJSON = options.parseJSON ?? false;
  // Belt and suspenders: the package tolerates a BOM, but stripping it here
  // guarantees header detection never sees it (spec: UTF-8 BOM stripped on input).
  const input = csv.startsWith(UTF8_BOM) ? csv.slice(UTF8_BOM.length) : csv;
  try {
    // Structural parsing only: the package's own value coercion (parseNumbers
    // mangles leading zeros; parseJSON JSON.parses every cell, turning
    // "1e999" into Infinity and long IDs with precision loss) would break
    // the smart contract before the walk could see the strings. Values are
    // converted here instead — CSV parsing itself stays in the package.
    const json = csv2json(input, {
      ...options,
      parseNumbers: false,
      parseJSON: false,
    }) as Record<string, unknown>[] | Record<string, unknown>;
    return applySmartValues(json, parseJSON, parseNumbers);
  } catch (e) {
    // The packages throw plain strings — rethrow as real Errors so callers
    // never see a swallowed or message-less failure.
    throw new Error(unwrapErrorMessage(e));
  }
}

export function jsonToJsonCsv(
  data: unknown,
  options: Json2CsvOptions = {}
): string {
  try {
    // P2: under Flatten the scalar-array join runs before the package sees
    // the data — its own flatten would reject those arrays (#80).
    const prepared = options.flatten ? joinScalarArrays(data) : data;
    return json2csv(prepared, options);
  } catch (e) {
    // The packages throw plain strings — rethrow as real Errors so callers
    // never see a swallowed or message-less failure.
    const message = unwrapErrorMessage(e);
    if (NON_TABULAR_PATTERNS.some((pattern) => message.startsWith(pattern))) {
      throw new NonTabularJsonError(
        nonTabularMessage(message, options.flatten ?? false)
      );
    }
    throw new Error(message);
  }
}

/**
 * Serialize JSON for display/download, mirroring the legacy tool's minify
 * behavior (js/src/csv2json.js:47): minify removes indentation, data is untouched.
 */
export function toJsonString(
  json: unknown,
  options: { minify?: boolean } = {}
): string {
  return JSON.stringify(json, null, options.minify ? undefined : 2);
}

/**
 * The two conversion directions of the converter page. Components stay
 * presentational; they only ever see this union and pass it back down.
 */
export type Direction = "csv2json" | "json2csv";

/** The full option set shown in the bottom options bar (direction-conditional). */
export type ConverterOptions = {
  /** "auto" → package-side detection over , ; \t */
  separator: "auto" | "," | ";" | "\t";
  parseNumbers: boolean;
  parseJSON: boolean;
  transpose: boolean;
  hash: boolean;
  minify: boolean;
  flatten: boolean;
};

export const DEFAULT_OPTIONS: ConverterOptions = {
  separator: "auto",
  // Smart parse-numbers is on by default: plain numbers become JSON numbers
  // while 00721 and long IDs stay strings (matches the legacy tool's checked
  // Parse numbers box, without its leading-zero mangling).
  parseNumbers: true,
  parseJSON: true,
  transpose: false,
  hash: false,
  minify: false,
  flatten: false,
};

export type ConversionResult =
  | {
      ok: true;
      text: string;
      rows: number;
      cols: number;
      /**
       * Non-blocking observations about input the package silently
       * reinterpreted — CSV→JSON direction only. Absent on clean input.
       */
      warnings?: string[];
    }
  | { ok: false; error: string };

/** Best-effort row/col counts for the pane headers. Empty cells → 0. */
function countShape(json: unknown): { rows: number; cols: number } {
  const collectKeys = (rows: unknown[]): Set<string> => {
    const keys = new Set<string>();
    for (const row of rows) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        Object.keys(row).forEach((key) => keys.add(key));
      }
    }
    return keys;
  };
  if (Array.isArray(json)) {
    return { rows: json.length, cols: collectKeys(json).size };
  }
  if (json && typeof json === "object") {
    const values = Object.values(json);
    return { rows: values.length, cols: collectKeys(values).size };
  }
  return { rows: 0, cols: 0 };
}

const separatorFor = (
  auto: ConverterOptions["separator"]
): Csv2JsonOptions["separator"] => (auto === "auto" ? undefined : auto);

/**
 * The 1-indexed line of the record whose quote never closed, or null when
 * every record is quote-balanced. An in-quote-state scanner over the raw
 * text: `""` doubling inside a quoted field never toggles state, and a
 * newline inside a quoted field is literal — so a record ends only at a
 * newline (or EOF) seen outside quotes. A record that ends while still
 * inside a quote carries odd outside-quote parity: the package's quoted
 * grammar failed, the field parsed as plain text, and stray quotes were
 * stripped in post-processing (art_afRt2cdg §2). Parity never inspects
 * separators, so it holds for , ; and \t alike.
 */
function unbalancedQuoteLine(text: string): number | null {
  let inQuote = false;
  let recordLine = 1;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      // "" inside a quoted field is an escaped quote — one unit, no toggle.
      if (inQuote && text[i + 1] === '"') i++;
      else inQuote = !inQuote;
    } else if (!inQuote && (char === "\n" || char === "\r")) {
      // Record boundary outside quotes — the parity here was even.
      if (char === "\r" && text[i + 1] === "\n") i++;
      recordLine++;
    }
  }
  // EOF closes the final record; still inside a quote → unbalanced.
  return inQuote ? recordLine : null;
}

/**
 * App-side warnings for the csv2json direction. The package reinterprets
 * malformed CSV silently — it has no warnings channel of its own (its only
 * throws are empty input, detection failure, empty header, and PEG syntax
 * errors; art_afRt2cdg §2). Two detectors over the raw input:
 *
 * 1. Unbalanced quotes — see unbalancedQuoteLine; rendered as "parsed as
 *    plain text" because that is exactly what the fallback does.
 * 2. Ragged rows — the package pads short rows with empty cells and drops
 *    extra cells without comment; parseCsvTable reports each data row's raw
 *    field width to compare against the header width.
 *
 * Two suppressions keep the warnings truthful:
 * - the record carrying an unbalanced quote is never width-checked — once
 *    the quote state breaks, the quote-aware record split diverges from the
 *    package's per-field unquoted fallback, so widths there are meaningless
 *    (the package usually still splits at the field's own delimiters — e.g.
 *    `name,amount\n"Avery,12.50` yields two fields, nothing padded);
 * - all-empty single-field records are skipped — blank lines never become
 *    rows in the package's output.
 */
export function csvWarnings(
  input: string,
  separator: Csv2JsonOptions["separator"]
): string[] {
  const warnings: string[] = [];
  const quoteLine = unbalancedQuoteLine(input);
  if (quoteLine !== null) {
    warnings.push(
      `Unbalanced quote on line ${quoteLine} — parsed as plain text`
    );
  }
  const table = parseCsvTable(input, separator);
  const suppressLastRow = quoteLine !== null && table.rows.length > 0;
  table.rowWidths.forEach((width, index) => {
    if (suppressLastRow && index === table.rowWidths.length - 1) return;
    const row = table.rows[index];
    if (width === 1 && row[0] === "") return;
    if (width === table.headers.length) return;
    warnings.push(
      width < table.headers.length
        ? `Row ${index + 1} has fewer fields than the header, padded`
        : `Row ${index + 1} has more fields than the header, extra fields dropped`
    );
  });
  return warnings;
}

/**
 * B4 (art_RfUU1oAy, fixes #143): hash mode keys each row's object by the
 * first column's value, so repeated values silently collapse — the package
 * overwrites (`json[hashKey] = row`, last row wins) with no signal. Collapse
 * is often the point (dedupe), so this warns and never blocks — and only in
 * hash mode: the array result keeps every row, so array mode has nothing to
 * warn about. Both counts come from the conversion itself: expected rows
 * from the array result (what hashing starts from), actual keys from the
 * hash result.
 */
export function duplicateKeyWarning(
  arrayRows: number,
  hashKeys: number
): string | null {
  return hashKeys < arrayRows
    ? `Duplicate keys collapsed: ${arrayRows} rows in, ${hashKeys} unique keys out — last row wins`
    : null;
}

/**
 * The single conversion entry point the UI calls. Pure: string in, a
 * discriminated result out — never throws. Empty input converts to empty
 * output; failures carry the package/parser message verbatim so the pane can
 * show it inline with position where the JSON parser provides one.
 */
export function convertText(
  direction: Direction,
  input: string,
  options: ConverterOptions = DEFAULT_OPTIONS
): ConversionResult {
  if (input.trim() === "") return { ok: true, text: "", rows: 0, cols: 0 };
  try {
    if (direction === "csv2json") {
      const csv2jsonOptions = {
        separator: separatorFor(options.separator),
        parseNumbers: options.parseNumbers,
        parseJSON: options.parseJSON,
        transpose: options.transpose,
        hash: options.hash,
      };
      const json = csvToJson(input, csv2jsonOptions);
      let warnings = csvWarnings(input, csv2jsonOptions.separator);
      if (options.hash && !Array.isArray(json)) {
        // The hash result carries no memory of how many rows went in (B4,
        // #143) — count what hashing started from: the array result for the
        // same input and options, minus hash. The parse is identical to the
        // run above, so this cannot fail where it passed, and the displayed
        // hash output stays exactly what the package produced.
        const arrayJson = csvToJson(input, { ...csv2jsonOptions, hash: false });
        const arrayRows = Array.isArray(arrayJson) ? arrayJson.length : 0;
        const collapse = duplicateKeyWarning(
          arrayRows,
          Object.keys(json).length
        );
        if (collapse) warnings = warnings.concat(collapse);
      }
      return {
        ok: true,
        text: toJsonString(json, { minify: options.minify }),
        ...countShape(json),
        // Warnings stay data-only here; the output pane renders them as a
        // non-blocking notice. Omitted entirely on clean input.
        ...(warnings.length > 0 ? { warnings } : {}),
      };
    }
    // The legacy tool parses the JSON text before handing it to the package
    // (js/src/json2csv.js:43) — mirror that so parse errors carry position.
    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch (e) {
      return {
        ok: false,
        error: `Invalid JSON — ${e instanceof Error ? e.message : String(e)}`,
      };
    }
    const csv = jsonToJsonCsv(data, {
      separator: separatorFor(options.separator),
      flatten: options.flatten,
    });
    // Count the PRODUCED CSV, not the raw input: with flatten on, nested
    // arrays explode into extra rows and dotted keys add columns, so the
    // input shape understates the output (art_afRt2cdg, root cause A).
    // Parsing the same string the preview and the download consume makes
    // count ≡ preview ≡ download by construction — with the delimiter
    // auto-detected exactly as the preview table detects it. The csv2json
    // branch already counts its converted output; both directions agree.
    const table = parseCsvTable(csv);
    return {
      ok: true,
      text: csv,
      rows: table.rows.length,
      cols: table.headers.length,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
