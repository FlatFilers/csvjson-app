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
