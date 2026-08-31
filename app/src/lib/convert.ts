import csv2json from "csvjson-csv2json";
import json2csv from "csvjson-json2csv";

/**
 * Typed wrapper over the csvjson conversion packages. The packages are
 * dependency-free CommonJS with no types and no runnable tests (see the
 * spec's Representative interfaces) — all conversion logic lives in them;
 * this module only adds the typed surface, BOM stripping, and normalized
 * errors. Conversion logic is never reimplemented here.
 */

export type Csv2JsonOptions = {
  /** omitted → auto-detect over , ; \t */
  separator?: "," | ";" | "\t";
  parseNumbers?: boolean;
  parseJSON?: boolean; // null, true, false, [], {}
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

export function csvToJson(
  csv: string,
  options: Csv2JsonOptions = {}
): Record<string, unknown>[] | Record<string, unknown> {
  // Belt and suspenders: the package tolerates a BOM, but stripping it here
  // guarantees header detection never sees it (spec: UTF-8 BOM stripped on input).
  const input = csv.startsWith(UTF8_BOM) ? csv.slice(UTF8_BOM.length) : csv;
  try {
    return csv2json(input, options) as
      | Record<string, unknown>[]
      | Record<string, unknown>;
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
  // parse numbers is off by default — it would turn 00721 into 7 (spec: Edge cases).
  parseNumbers: false,
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
