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

/**
 * B1 (art_RfUU1oAy): "skip" drops empty cells from the output; "keep" — the
 * default — emits them as "" (today's behavior).
 */
export type EmptyFields = "keep" | "skip";

/**
 * B1 (art_RfUU1oAy): "null" maps the exact, case-sensitive string "NULL"
 * (SQL exports are uppercase) to JSON null; "string" — the default — leaves
 * it a string. Lowercase null already parses via parseJSON.
 */
export type NullLiterals = "string" | "null";

export type Csv2JsonOptions = {
  /**
   * omitted → auto-detect over , ; \t. "|" is explicit-only (B2, #110): prose
   * is full of pipes, so detection never picks it — pass it to split on them.
   */
  separator?: "," | ";" | "\t" | "|";
  /**
   * Smart number parsing — on by default. A cell becomes a JSON number only
   * when it is a full JSON number literal, has no leading zeros in the
   * integer part, is finite, and — when an integer — satisfies
   * Number.isSafeInteger. Surrounding whitespace does not block the parse:
   * the numeric-adjacency guard trims before interpretation (B5), while
   * non-numbers keep their padding. `false` keeps every cell a string.
   */
  parseNumbers?: boolean;
  /**
   * Turns JSON literals (null, true, false, [], {} and nested JSON) into real
   * values. Never produces numbers — numbers belong to parseNumbers.
   */
  parseJSON?: boolean;
  /**
   * B1 (fixes #65 #100 #46 #6): "skip" deletes every key whose value is
   * exactly the empty string — a column empty in every row stops appearing.
   * "keep" — the default — emits "".
   */
  emptyFields?: EmptyFields;
  /**
   * B1: "null" maps the exact, case-sensitive string "NULL" to JSON null;
   * "string" — the default — leaves it a string.
   */
  nullLiterals?: NullLiterals;
  transpose?: boolean;
  hash?: boolean; // first column becomes the object key
  /**
   * Collapses contiguous 0- or 1-based indexed header groups (e.g.
   * `code.0, code.1` or `code[0], code[1]`, and nested `items.0.sku, items.1.sku`)
   * into arrays under their shared prefix when transpose is off. Defaults to true.
   */
  collapseIndexedArrays?: boolean;
};

export type Json2CsvOptions = {
  /** "|" is explicit-only — never auto-detected (B2, #110). */
  separator?: "," | ";" | "\t" | "|";
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
 * Anchored, so embedded whitespace and thousands separators never match.
 * Surrounding whitespace is the caller's business — toSmartNumber trims
 * before testing (numeric adjacency, B5) — never this pattern's.
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
  // Numeric adjacency (B5): with field whitespace preserved (trim:false),
  // interpretation still ignores surrounding padding — " 5 " converts to 5.
  // A non-number keeps the original padded string.
  const literal = value.trim();
  if (!JSON_NUMBER_LITERAL.test(literal)) return value;
  const parsed = Number(literal);
  if (!Number.isFinite(parsed)) return value;
  if (Number.isInteger(parsed) && !Number.isSafeInteger(parsed)) return value;
  return parsed;
}

function tryParseJsonLiteral(
  value: string
): { ok: true; value: unknown } | { ok: false } {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: false };
  if (trimmed === "true") return { ok: true, value: true };
  if (trimmed === "false") return { ok: true, value: false };
  if (trimmed === "null") return { ok: true, value: null };
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if (
    (first === "{" && last === "}") ||
    (first === "[" && last === "]") ||
    (first === '"' && last === '"' && trimmed.length >= 2)
  ) {
    try {
      return { ok: true, value: JSON.parse(trimmed) };
    } catch {
      return { ok: false };
    }
  }
  return { ok: false };
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
/** Everything the per-cell post-pass needs, fully resolved from options. */
type CellPass = {
  parseJSON: boolean;
  parseNumbers: boolean;
  emptyFields: EmptyFields;
  nullLiterals: NullLiterals;
};

function smartCellValue(value: string, pass: CellPass): unknown {
  if (pass.parseJSON) {
    const parsed = tryParseJsonLiteral(value);
    if (parsed.ok && typeof parsed.value !== "number") return parsed.value;
  }
  if (pass.parseNumbers) return toSmartNumber(value);
  return value;
}

/**
 * Applies smartCellValue to every cell of the package's output. The package
 * returns either an array of records, or — with hash — an object whose
 * values are records; keys are never touched.
 */
function applySmartValues(
  json: Record<string, unknown>[] | Record<string, unknown>,
  pass: CellPass
): Record<string, unknown>[] | Record<string, unknown> {
  const convertRow = (row: Record<string, unknown>): Record<string, unknown> => {
    const converted: Record<string, unknown> = {};
    for (const key of Object.keys(row)) {
      const value = row[key];
      if (typeof value !== "string") {
        // Non-strings pass through — the B1 matches below are string-exact.
        converted[key] = value;
        continue;
      }
      const smart = smartCellValue(value, pass);
      // B1: "skip" deletes keys whose value is exactly the empty string.
      if (pass.emptyFields === "skip" && smart === "") continue;
      // B1: the exact uppercase NULL literal becomes null — case-sensitive,
      // so Null stays a string; lowercase null is parseJSON's business.
      if (pass.nullLiterals === "null" && smart === "NULL") {
        converted[key] = null;
        continue;
      }
      converted[key] = smart;
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

export interface IndexedHeaderGroup {
  prefix: string;
  indices: number[];
  columns: string[];
}

type ParsedIndexedHeader = {
  column: string;
  prefix: string;
  index: number;
  notation: "dot" | "bracket";
  subKey?: string;
};

const INDEXED_HEADER_RE =
  /^([^.[\]]+)(?:\.(0|[1-9]\d*)|\[(0|[1-9]\d*)\])(?:\.(.+))?$/;

function parseIndexedHeader(column: string): ParsedIndexedHeader | null {
  const match = INDEXED_HEADER_RE.exec(column);
  if (!match) return null;
  const prefix = match[1];
  const dotIdx = match[2];
  const bracketIdx = match[3];
  const subKey = match[4];
  const index = Number(dotIdx ?? bracketIdx);
  if (!Number.isSafeInteger(index)) return null;
  return {
    column,
    prefix,
    index,
    notation: dotIdx !== undefined ? "dot" : "bracket",
    ...(subKey !== undefined ? { subKey } : {}),
  };
}

/**
 * Detects when 2 or more CSV headers form a 0-based or 1-based contiguous
 * numeric index group using dot (`code.0, code.1`) or bracket (`code[0], code[1]`)
 * notation, including nested object-in-array headers (`items.0.sku, items.0.qty,
 * items.1.sku, items.1.qty`). Single or non-contiguous dotted headers like
 * `v1.0` or `price.usd` are ignored.
 */
export function detectIndexedHeaderGroups(
  headers: string[]
): IndexedHeaderGroup[] {
  const headerSet = new Set(headers);
  const byPrefix = new Map<string, ParsedIndexedHeader[]>();

  for (const header of headers) {
    const parsed = parseIndexedHeader(header);
    if (!parsed) continue;
    const list = byPrefix.get(parsed.prefix);
    if (list) {
      list.push(parsed);
    } else {
      byPrefix.set(parsed.prefix, [parsed]);
    }
  }

  const groups: IndexedHeaderGroup[] = [];
  for (const [prefix, entries] of byPrefix.entries()) {
    // Do not clobber an existing standalone column with the same name as prefix.
    if (headerSet.has(prefix)) continue;

    const firstHasSubKey = entries[0].subKey !== undefined;
    const firstNotation = entries[0].notation;
    if (
      entries.some(
        (e) =>
          (e.subKey !== undefined) !== firstHasSubKey ||
          e.notation !== firstNotation
      )
    ) {
      continue;
    }

    // Reject duplicate column slots within the same prefix (e.g. duplicate headers).
    const slotSignatures = new Set<string>();
    let hasDuplicateSlot = false;
    for (const entry of entries) {
      const sig = `${entry.index}:${entry.subKey ?? ""}`;
      if (slotSignatures.has(sig)) {
        hasDuplicateSlot = true;
        break;
      }
      slotSignatures.add(sig);
    }
    if (hasDuplicateSlot) continue;

    const indices = Array.from(new Set(entries.map((e) => e.index))).sort(
      (a, b) => a - b
    );
    if (indices.length < 2) continue;
    const start = indices[0];
    if (start !== 0 && start !== 1) continue;
    const contiguous = indices.every((idx, i) => idx === start + i);
    if (!contiguous) continue;

    groups.push({
      prefix,
      indices,
      columns: entries.map((e) => e.column),
    });
  }

  return groups;
}

function isEmptyIndexedSlot(value: unknown, emptyFields: EmptyFields): boolean {
  if (value === undefined || value === "") return true;
  if (emptyFields === "skip" && value === null) return true;
  return false;
}

function collapseRowIndexedGroups(
  row: Record<string, unknown>,
  headers: string[],
  groups: IndexedHeaderGroup[],
  emptyFields: EmptyFields
): Record<string, unknown> {
  const groupByFirstColumn = new Map<string, IndexedHeaderGroup>();
  const memberColumns = new Set<string>();
  const parsedByGroup = new Map<string, ParsedIndexedHeader[]>();

  for (const group of groups) {
    if (group.columns.length === 0) continue;
    groupByFirstColumn.set(group.columns[0], group);
    for (const col of group.columns) {
      memberColumns.add(col);
    }
    parsedByGroup.set(
      group.prefix,
      group.columns
        .map((col) => parseIndexedHeader(col))
        .filter((p): p is ParsedIndexedHeader => p !== null)
    );
  }

  const collapsed: Record<string, unknown> = {};
  for (const header of headers) {
    const group = groupByFirstColumn.get(header);
    if (group) {
      const parsedEntries = parsedByGroup.get(group.prefix) ?? [];
      const isNested = parsedEntries.some((e) => e.subKey !== undefined);
      if (!isNested) {
        const byIndex = new Map<number, string>();
        for (const entry of parsedEntries) {
          byIndex.set(entry.index, entry.column);
        }
        const values: unknown[] = [];
        for (const idx of group.indices) {
          const col = byIndex.get(idx);
          if (!col) continue;
          const val = row[col];
          if (isEmptyIndexedSlot(val, emptyFields)) continue;
          values.push(val);
        }
        if (values.length === 0 && emptyFields === "skip") continue;
        collapsed[group.prefix] = values;
      } else {
        const entriesByIndex = new Map<number, ParsedIndexedHeader[]>();
        for (const entry of parsedEntries) {
          const list = entriesByIndex.get(entry.index);
          if (list) list.push(entry);
          else entriesByIndex.set(entry.index, [entry]);
        }
        const objects: Record<string, unknown>[] = [];
        for (const idx of group.indices) {
          const idxEntries = entriesByIndex.get(idx) ?? [];
          const itemObj: Record<string, unknown> = {};
          for (const entry of idxEntries) {
            if (!entry.subKey) continue;
            const val = row[entry.column];
            if (isEmptyIndexedSlot(val, emptyFields)) continue;
            itemObj[entry.subKey] = val;
          }
          if (Object.keys(itemObj).length > 0) {
            objects.push(itemObj);
          }
        }
        if (objects.length === 0 && emptyFields === "skip") continue;
        collapsed[group.prefix] = objects;
      }
      continue;
    }

    if (memberColumns.has(header)) continue;
    if (Object.prototype.hasOwnProperty.call(row, header)) {
      collapsed[header] = row[header];
    }
  }

  return collapsed;
}

function collapseIndexedArraysInJson(
  rawJson: Record<string, unknown>[] | Record<string, unknown>,
  smartJson: Record<string, unknown>[] | Record<string, unknown>,
  emptyFields: EmptyFields
): Record<string, unknown>[] | Record<string, unknown> {
  if (Array.isArray(rawJson) && Array.isArray(smartJson)) {
    const firstRaw = rawJson[0];
    if (!isRecord(firstRaw)) return smartJson;
    const headers = Object.keys(firstRaw);
    const groups = detectIndexedHeaderGroups(headers);
    if (groups.length === 0) return smartJson;
    return smartJson.map((row) =>
      isRecord(row)
        ? collapseRowIndexedGroups(row, headers, groups, emptyFields)
        : row
    );
  }
  if (!Array.isArray(rawJson) && !Array.isArray(smartJson)) {
    const firstRaw = Object.values(rawJson)[0];
    if (!isRecord(firstRaw)) return smartJson;
    const headers = Object.keys(firstRaw);
    const groups = detectIndexedHeaderGroups(headers);
    if (groups.length === 0) return smartJson;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(smartJson)) {
      out[key] = isRecord(value)
        ? collapseRowIndexedGroups(value, headers, groups, emptyFields)
        : value;
    }
    return out;
  }
  return smartJson;
}

export function csvToJson(
  csv: string,
  options: Csv2JsonOptions = {}
): Record<string, unknown>[] | Record<string, unknown> {
  // Smart parse-numbers defaults on; explicit false restores all-strings.
  // The B1 defaults — "keep" / "string" — reproduce today's output exactly.
  const pass: CellPass = {
    parseNumbers: options.parseNumbers ?? true,
    parseJSON: options.parseJSON ?? false,
    emptyFields: options.emptyFields ?? "keep",
    nullLiterals: options.nullLiterals ?? "string",
  };
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
      // B5 (fixes #87 #95): the package's unconditional field trim discarded
      // leading/trailing whitespace RFC-4180 section 2.4 keeps part of the
      // field — preservation is impossible app-side because the trim runs
      // before the wrapper sees values. The patched trim option is pinned
      // false here; the smart pass restores numeric adjacency (toSmartNumber).
      trim: false,
    }) as Record<string, unknown>[] | Record<string, unknown>;
    const smart = applySmartValues(json, pass);
    if (options.collapseIndexedArrays !== false && !options.transpose) {
      return collapseIndexedArraysInJson(json, smart, pass.emptyFields);
    }
    return smart;
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
  /** "auto" → package-side detection over , ; \t; "|" must be selected (B2, #110). */
  separator: "auto" | "," | ";" | "\t" | "|";
  parseNumbers: boolean;
  parseJSON: boolean;
  /** B1: "skip" drops cells that are exactly the empty string. */
  emptyFields: EmptyFields;
  /** B1: "null" maps the exact uppercase NULL string to JSON null. */
  nullLiterals: NullLiterals;
  transpose: boolean;
  hash: boolean;
  minify: boolean;
  flatten: boolean;
  collapseIndexedArrays?: boolean;
};

export const DEFAULT_OPTIONS: ConverterOptions = {
  separator: "auto",
  // Smart parse-numbers is on by default: plain numbers become JSON numbers
  // while 00721 and long IDs stay strings (matches the legacy tool's checked
  // Parse numbers box, without its leading-zero mangling).
  parseNumbers: true,
  parseJSON: true,
  emptyFields: "keep",
  nullLiterals: "string",
  transpose: false,
  hash: false,
  minify: false,
  flatten: false,
  collapseIndexedArrays: true,
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

export interface JsonWrapperCandidate {
  key: string;
  rowCount: number;
  unwrappedJson: string;
}

export interface JsonFormatToggleAction {
  label: "Format" | "Minify";
  nextInput: string;
}

const PRIORITY_WRAPPER_KEYS = [
  "data",
  "items",
  "results",
  "records",
  "rows",
] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * When `input` parses as a plain object (not an array), find top-level keys
 * whose value is a non-empty Array of plain objects (`Record<string, unknown>`),
 * prioritizing common REST wrapper keys (`data`, `items`, `results`, `records`, `rows`)
 * before remaining keys in declaration order.
 */
export function detectJsonWrapperCandidates(
  input: string
): JsonWrapperCandidate[] {
  const trimmed = input.trim();
  if (trimmed === "" || !trimmed.startsWith("{")) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return [];
  }
  if (!isPlainRecord(parsed)) return [];

  const allKeys = Object.keys(parsed);
  const prioritySet = new Set<string>(PRIORITY_WRAPPER_KEYS);
  const orderedKeys = [
    ...PRIORITY_WRAPPER_KEYS.filter((k) => allKeys.includes(k)),
    ...allKeys.filter((k) => !prioritySet.has(k)),
  ];

  const candidates: JsonWrapperCandidate[] = [];
  for (const key of orderedKeys) {
    const val = parsed[key];
    if (
      Array.isArray(val) &&
      val.length > 0 &&
      val.every((item) => isPlainRecord(item))
    ) {
      candidates.push({
        key,
        rowCount: val.length,
        unwrappedJson: JSON.stringify(val, null, 2),
      });
    }
  }
  return candidates;
}

/**
 * Attempt to parse multi-line JSONL / NDJSON when standard `JSON.parse` fails.
 * Succeeds only when `input` has 2 or more non-empty lines and every non-empty
 * line parses via `JSON.parse(line)` into a non-null object or array.
 */
function tryParseJsonLines(input: string): unknown[] | null {
  const nonEmptyLines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (nonEmptyLines.length < 2) return null;

  const parsedLines: unknown[] = [];
  for (const line of nonEmptyLines) {
    try {
      const val: unknown = JSON.parse(line);
      if (typeof val !== "object" || val === null) {
        return null;
      }
      parsedLines.push(val);
    } catch {
      return null;
    }
  }
  return parsedLines;
}

/**
 * Determine the contextual Format / Minify action for the JSON→CSV input pane.
 * Returns null when `input` is empty or neither valid JSON nor valid multi-line
 * JSONL/NDJSON. When valid:
 * - Returns `{ label: "Minify", nextInput: JSON.stringify(parsed) }` when
 *   `input.trim() === JSON.stringify(parsed, null, 2)`.
 * - Returns `{ label: "Format", nextInput: JSON.stringify(parsed, null, 2) }`
 *   otherwise (minified JSON, inconsistently indented JSON, or multi-line JSONL).
 */
export function resolveJsonFormatToggle(
  input: string
): JsonFormatToggleAction | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    const jsonlData = tryParseJsonLines(trimmed);
    if (jsonlData === null) return null;
    parsed = jsonlData;
  }

  const formatted = JSON.stringify(parsed, null, 2);
  if (trimmed === formatted) {
    return {
      label: "Minify",
      nextInput: JSON.stringify(parsed),
    };
  }
  return {
    label: "Format",
    nextInput: formatted,
  };
}

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
        emptyFields: options.emptyFields,
        nullLiterals: options.nullLiterals,
        transpose: options.transpose,
        hash: options.hash,
        collapseIndexedArrays: options.collapseIndexedArrays ?? true,
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
      const jsonlData = tryParseJsonLines(input);
      if (jsonlData !== null) {
        data = jsonlData;
      } else {
        return {
          ok: false,
          error: `Invalid JSON — ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }
    const separator = separatorFor(options.separator);
    const csv = jsonToJsonCsv(data, {
      separator,
      flatten: options.flatten,
    });
    // Count the PRODUCED CSV, not the raw input: with flatten on, nested
    // arrays explode into extra rows and dotted keys add columns, so the
    // input shape understates the output (art_afRt2cdg, root cause A).
    // Parsing the same string the preview and the download consume makes
    // count ≡ preview ≡ download by construction — forwarding the active
    // separator (or auto-detecting when set to auto) so pipe-delimited
    // output splits identically in counts and preview. The csv2json
    // branch already counts its converted output; both directions agree.
    const table = parseCsvTable(csv, separator);
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
