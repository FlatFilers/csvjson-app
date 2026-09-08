import { serializeCsvTable, type CsvTableData } from "./csvTable";

/**
 * Whole-table deletion transforms (spec increment: row/column deletion).
 *
 * A deletion mutates the parsed grid and re-serializes it — the same
 * serializeCsvTable → setInput → guarded-reconversion path a cell edit
 * takes, so the raw CSV text stays the single source of truth. Both
 * transforms are total: indices outside the table are ignored, and the
 * result re-parses to exactly the grid described here (the RFC 4180
 * round-trip is stable).
 *
 * Deleting rows keeps their exact source positions meaningful only until
 * the re-parse: the caller must drop any selection keyed by source index
 * (positions shift after a middle-row deletion). The output's rowWidths
 * re-derive from the new parse, so serialized rows all match the header
 * width and never trip the malformed-CSV warning detector.
 */

/**
 * CSV text for `table` minus the given SOURCE row indices. Headers are
 * kept even when every data row is dropped — the caller guards the
 * column count, not the row count; a headers-only table is valid.
 */
export function serializeTableWithoutRows(table: CsvTableData, sources: readonly number[]): string {
  const dropped = new Set(sources);
  const rows = table.rows.filter((_, source) => !dropped.has(source));
  return serializeCsvTable(table.headers, rows, table.delimiter);
}

/**
 * CSV text for `table` minus the given DATA column indices (0-based,
 * excluding the row-number gutter). Drops each selected header and the
 * matching cell from every row. Callers must guarantee at least one
 * column survives — the converter needs a column to detect.
 */
export function serializeTableWithoutColumns(table: CsvTableData, dataCols: readonly number[]): string {
  const dropped = new Set(dataCols);
  const headers = table.headers.filter((_, col) => !dropped.has(col));
  const rows = table.rows.map((row) => row.filter((_, col) => !dropped.has(col)));
  return serializeCsvTable(headers, rows, table.delimiter);
}
