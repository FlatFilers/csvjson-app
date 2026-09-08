/**
 * Selection → CSV serialization for the grid (spec: CSV table superpowers).
 * Glide Data Grid's built-in copy emits TSV; this module is the CSV
 * authority instead — the component maps the live GridSelection into the
 * plain shape below and both the toolbar button and the copy-key
 * interception serialize through `serializeCsvTable` (RFC 4180), so copied
 * data round-trips through the converter exactly like the raw text does.
 *
 * Coordinates are VIEW space (filtered/sorted rows, grid columns including
 * the leading row-number gutter). Mapping to source rows happens here via
 * the `view` array, mirroring the grid's own row mapping.
 */

import { serializeCsvTable, type CsvTableData } from "./csvTable";

export type SelectionRect = { x: number; y: number; width: number; height: number };

/** The piece of a grid selection that copy cares about. */
export type SelectionShape = {
  /** Rectangular ranges (drag select, shift+arrow, multi-rect with ctrl). */
  ranges: readonly SelectionRect[];
  /** Fully selected columns (header click / ctrl+header). */
  columns: readonly number[];
  /** Fully selected rows (gutter click / shift+gutter). */
  rows: readonly number[];
};

/** Blocks from successive ranges are joined by a blank line so a paste into
 * a sheet keeps the ranges visually apart. */
const RANGE_SEPARATOR = "\n\n";

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

/**
 * Serialize the active selection as RFC 4180 CSV. Precedence mirrors the
 * grid's native copy: ranges first, then whole rows, then whole columns.
 * Returns null when the selection holds no copyable data — the caller then
 * leaves native clipboard behavior alone. The leading gutter columns are
 * never copied: row numbers are chrome, not data.
 */
export function serializeGridSelection(
  table: CsvTableData,
  view: readonly number[],
  selection: SelectionShape,
  gutterColumns: number
): string | null {
  const dataColumns = table.headers.length;

  // Ranges: map view rows back to source rows, drop the gutter columns.
  const rangeBlocks: string[] = [];
  for (const range of selection.ranges) {
    const fromCol = clamp(range.x, gutterColumns + dataColumns);
    const toCol = clamp(range.x + range.width, gutterColumns + dataColumns);
    if (toCol <= gutterColumns) continue; // gutter-only range
    const dataFrom = fromCol - gutterColumns;
    const dataTo = toCol - gutterColumns;
    if (dataTo <= dataFrom) continue;

    const fromRow = clamp(range.y, view.length);
    const toRow = clamp(range.y + range.height, view.length);
    if (toRow <= fromRow) continue;

    const headers = table.headers.slice(dataFrom, dataTo);
    const rows: string[][] = [];
    for (let v = fromRow; v < toRow; v++) {
      const source = view[v];
      if (source === undefined) continue;
      const row = table.rows[source] ?? [];
      rows.push(headers.map((_, c) => row[dataFrom + c] ?? ""));
    }
    if (rows.length === 0) continue;
    rangeBlocks.push(serializeCsvTable(headers, rows, table.delimiter));
  }
  if (rangeBlocks.length > 0) return rangeBlocks.join(RANGE_SEPARATOR);

  // Whole rows: view-ordered source rows, all data columns, headers on top.
  const rowIndices = [...selection.rows]
    .filter((v) => v >= 0 && v < view.length)
    .map((v) => view[v])
    .filter((source) => source !== undefined);
  if (rowIndices.length > 0) {
    return serializeCsvTable(
      table.headers,
      rowIndices.map((source) => table.rows[source] ?? []),
      table.delimiter
    );
  }

  // Whole columns: one table with just the selected columns, all view rows.
  const colIndices = [...selection.columns].filter((c) => c >= gutterColumns && c < gutterColumns + dataColumns);
  if (colIndices.length > 0) {
    const headers = colIndices.map((c) => table.headers[c - gutterColumns]);
    const rows = view.map((source) => {
      const row = table.rows[source] ?? [];
      return colIndices.map((c) => row[c - gutterColumns] ?? "");
    });
    return serializeCsvTable(headers, rows, table.delimiter);
  }

  return null;
}
