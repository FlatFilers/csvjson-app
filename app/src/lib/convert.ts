import csv2json from "csvjson-csv2json";
import json2csv from "csvjson-json2csv";

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
  flatten?: boolean; // nested arrays → extra rows, dotted keys
};

/** Thrown when JSON→CSV receives non-tabular JSON (scalar or array of scalars). */
export class NonTabularJsonError extends Error {
  constructor() {
    super("I need an array of objects — try enabling Flatten");
    this.name = "NonTabularJsonError";
  }
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
    return json2csv(data, options);
  } catch (e) {
    // The packages throw plain strings — rethrow as real Errors so callers
    // never see a swallowed or message-less failure.
    const message = unwrapErrorMessage(e);
    if (NON_TABULAR_PATTERNS.some((pattern) => message.startsWith(pattern))) {
      throw new NonTabularJsonError();
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
  | { ok: true; text: string; rows: number; cols: number }
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
      const json = csvToJson(input, {
        separator: separatorFor(options.separator),
        parseNumbers: options.parseNumbers,
        parseJSON: options.parseJSON,
        transpose: options.transpose,
        hash: options.hash,
      });
      return {
        ok: true,
        text: toJsonString(json, { minify: options.minify }),
        ...countShape(json),
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
    return { ok: true, text: csv, ...countShape(data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
