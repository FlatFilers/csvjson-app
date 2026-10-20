/**
 * Developer egress formatters for CSV → JSON output (spec AC-13 / D12).
 *
 * Pure transformations from the converted JSON output into:
 * - `json`: the formatted or minified JSON string as-is
 * - `jsonl`: newline-delimited JSON records (one compact JSON object per line)
 * - `sql`: ANSI SQL `CREATE TABLE` + batched `INSERT INTO` statements with
 *   inferred column types (`INTEGER`, `NUMERIC`, `BOOLEAN`, `TEXT`), double-quoted
 *   identifiers, single-quote literal escaping (`''`), and `NULL` literals
 * - `ts`: TypeScript `export interface DataRow` with per-column inferred types
 *   and `export const data: DataRow[] = ...;`
 */

export type EgressFormat = "json" | "jsonl" | "sql" | "ts";

export type SqlColumnType = "INTEGER" | "NUMERIC" | "BOOLEAN" | "TEXT";

export const EGRESS_FORMAT_OPTIONS: readonly {
  format: EgressFormat;
  label: string;
  extension: EgressFormat;
  mime: string;
}[] = [
  { format: "json", label: "JSON", extension: "json", mime: "application/json" },
  {
    format: "jsonl",
    label: "JSONL",
    extension: "jsonl",
    mime: "application/x-ndjson",
  },
  { format: "sql", label: "SQL", extension: "sql", mime: "application/sql" },
  { format: "ts", label: "TS", extension: "ts", mime: "text/typescript" },
] as const;

const RECOGNIZED_DATA_EXTENSIONS = new Set([
  "csv",
  "tsv",
  "txt",
  "json",
  "jsonl",
  "sql",
  "ts",
]);

const VALID_TS_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalize parsed JSON output (either an array of row objects or a hash-mode
 * object mapping keys to row objects) into an ordered array of row records.
 */
export function extractEgressRows(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    return parsed.map((item) => (isRecord(item) ? item : { value: item }));
  }
  if (isRecord(parsed)) {
    const values = Object.values(parsed);
    if (values.length > 0 && values.every(isRecord)) {
      return values;
    }
    if (values.length === 0) {
      return [];
    }
    return [parsed];
  }
  return [];
}

/**
 * Collect all unique column keys across rows in first-seen declaration order.
 */
function collectColumns(rows: Record<string, unknown>[]): string[] {
  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return columns;
}

/**
 * Derive a sanitized SQL table name from an uploaded filename:
 * strips `.csv`/`.tsv`/`.txt` (and stacked data extensions), replaces
 * non-alphanumeric runs with `_`, trims leading/trailing `_`, and falls back
 * to `"data"`.
 */
export function sanitizeSqlTableName(filename?: string | null): string {
  if (!filename) return "data";
  let base = filename.trim();
  // Strip any leading path components if present
  const lastSlash = Math.max(base.lastIndexOf("/"), base.lastIndexOf("\\"));
  if (lastSlash >= 0) {
    base = base.slice(lastSlash + 1);
  }
  for (;;) {
    const dot = base.lastIndexOf(".");
    if (dot <= 0) break;
    if (dot === base.length - 1) {
      base = base.slice(0, dot);
      continue;
    }
    const ext = base.slice(dot + 1).toLowerCase();
    if (!RECOGNIZED_DATA_EXTENSIONS.has(ext)) break;
    base = base.slice(0, dot);
  }
  const sanitized = base
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return sanitized.length > 0 ? sanitized : "data";
}

/**
 * Double-quote an ANSI SQL identifier, escaping embedded double quotes as `""`.
 */
export function quoteSqlIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Infer the ANSI SQL column type across all non-null values in a column:
 * - all integer numbers -> `INTEGER`
 * - all finite numbers (with at least one float) -> `NUMERIC`
 * - all booleans -> `BOOLEAN`
 * - everything else (strings, containers, mixed types, or all-null) -> `TEXT`
 */
export function inferSqlColumnType(values: unknown[]): SqlColumnType {
  const defined = values.filter((v) => v !== null && v !== undefined);
  if (defined.length === 0) return "TEXT";

  if (defined.every((v) => typeof v === "boolean")) {
    return "BOOLEAN";
  }

  if (defined.every((v) => typeof v === "number" && Number.isFinite(v))) {
    return defined.every((v) => Number.isInteger(v)) ? "INTEGER" : "NUMERIC";
  }

  return "TEXT";
}

/**
 * Format a cell value as an ANSI SQL literal.
 */
export function formatSqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }
  if (typeof value === "string") {
    return `'${value.replace(/'/g, "''")}'`;
  }
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
}

/**
 * Convert parsed rows into newline-delimited JSON (`JSONL`).
 */
export function formatJsonLines(jsonText: string): string {
  const trimmed = jsonText.trim();
  if (trimmed === "") return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return jsonText;
  }
  const rows = extractEgressRows(parsed);
  return rows.map((row) => JSON.stringify(row)).join("\n");
}

/**
 * Convert parsed rows into ANSI SQL `CREATE TABLE` + `INSERT INTO` statements.
 */
export function formatSqlOutput(
  jsonText: string,
  filename?: string | null
): string {
  const trimmed = jsonText.trim();
  if (trimmed === "") return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return jsonText;
  }

  const rows = extractEgressRows(parsed);
  const columns = collectColumns(rows);
  const tableName = quoteSqlIdentifier(sanitizeSqlTableName(filename));

  if (columns.length === 0) {
    return `CREATE TABLE ${tableName} ();`;
  }

  const columnDefs = columns.map((col) => {
    const colValues = rows.map((row) => row[col]);
    const sqlType = inferSqlColumnType(colValues);
    return `  ${quoteSqlIdentifier(col)} ${sqlType}`;
  });

  const createTableStmt = `CREATE TABLE ${tableName} (\n${columnDefs.join(",\n")}\n);`;
  if (rows.length === 0) {
    return createTableStmt;
  }

  const quotedCols = columns.map(quoteSqlIdentifier).join(", ");
  const valueTuples = rows.map((row) => {
    const tuple = columns.map((col) => formatSqlValue(row[col])).join(", ");
    return `  (${tuple})`;
  });

  const insertStmt = `INSERT INTO ${tableName} (${quotedCols}) VALUES\n${valueTuples.join(",\n")};`;
  return `${createTableStmt}\n\n${insertStmt}`;
}

function inferSingleValueTsType(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const elemTypes = orderTsTypes(
      Array.from(new Set(value.map((item) => inferSingleValueTsType(item))))
    );
    if (elemTypes.length === 1) {
      return `${elemTypes[0]}[]`;
    }
    return `(${elemTypes.join(" | ")})[]`;
  }
  if (isRecord(value)) {
    return "Record<string, unknown>";
  }
  return "unknown";
}

const TS_TYPE_ORDER: Record<string, number> = {
  string: 1,
  number: 2,
  boolean: 3,
  "Record<string, unknown>": 4,
  unknown: 90,
  null: 100,
};

function orderTsTypes(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const rankA = TS_TYPE_ORDER[a] ?? 50;
    const rankB = TS_TYPE_ORDER[b] ?? 50;
    if (rankA !== rankB) return rankA - rankB;
    return a.localeCompare(b);
  });
}

export function formatTsPropertyKey(key: string): string {
  return VALID_TS_IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

/**
 * Convert parsed rows into a TypeScript `DataRow` interface + typed `data` array.
 */
export function formatTypeScriptOutput(jsonText: string): string {
  const trimmed = jsonText.trim();
  if (trimmed === "") return "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return jsonText;
  }

  const rows = extractEgressRows(parsed);
  const columns = collectColumns(rows);

  const propLines = columns.map((col) => {
    let hasMissing = false;
    const seenTypes = new Set<string>();
    for (const row of rows) {
      if (
        !Object.prototype.hasOwnProperty.call(row, col) ||
        row[col] === undefined
      ) {
        hasMissing = true;
        continue;
      }
      seenTypes.add(inferSingleValueTsType(row[col]));
    }
    const orderedTypes = orderTsTypes(Array.from(seenTypes));
    const typeAnnotation =
      orderedTypes.length > 0 ? orderedTypes.join(" | ") : "unknown";
    const optionalMarker = hasMissing ? "?" : "";
    return `  ${formatTsPropertyKey(col)}${optionalMarker}: ${typeAnnotation};`;
  });

  const interfaceBlock =
    propLines.length > 0
      ? `export interface DataRow {\n${propLines.join("\n")}\n}`
      : `export interface DataRow {}`;

  return `${interfaceBlock}\n\nexport const data: DataRow[] = ${JSON.stringify(rows, null, 2)};`;
}

/**
 * Format converted CSV→JSON output into the selected developer egress format.
 */
export function formatEgressOutput(
  jsonTextOrResult: string | { text: string },
  egressFormat: EgressFormat,
  filenameOrOptions?: string | null | { hash?: boolean; minify?: boolean },
  maybeFilename?: string | null
): string {
  const jsonText =
    typeof jsonTextOrResult === "string"
      ? jsonTextOrResult
      : jsonTextOrResult.text;
  const filename =
    typeof filenameOrOptions === "string" || filenameOrOptions === null
      ? filenameOrOptions
      : (maybeFilename ?? null);

  switch (egressFormat) {
    case "json":
      return jsonText;
    case "jsonl":
      return formatJsonLines(jsonText);
    case "sql":
      return formatSqlOutput(jsonText, filename);
    case "ts":
      return formatTypeScriptOutput(jsonText);
  }
}
