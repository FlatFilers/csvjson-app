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
    const dataFrom = Math.max(0, fromCol - gutterColumns);
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

export interface SelectionStats {
  cellCount: number;
  distinctCount: number;
  emptyCount: number;
  numericCount: number;
  sum: number | null;
  avg: number | null;
  min: number | null;
  max: number | null;
}

const MAX_STATS_CELLS = 100_000;
const NUMERIC_CELL_RE = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;

/**
 * Compute live spreadsheet-style aggregate statistics across all unique
 * (viewRow, dataCol) coordinates in the active selection (rectangular ranges,
 * whole rows, and whole columns).
 *
 * Returns null when nothing is selected, or when only a single cell
 * (cellCount < 2) is selected without a full row or column selection.
 */
export function computeSelectionStats(
  table: CsvTableData,
  view: readonly number[],
  selection: SelectionShape,
  gutterColumns: number
): SelectionStats | null {
  const dataColumns = table.headers.length;
  const viewLength = view.length;
  if (dataColumns === 0 || viewLength === 0) return null;

  const visited = new Set<number>();

  // 1. Rectangular ranges (subtracting gutterColumns from rect.x, skipping gutter columns < 0).
  for (const range of selection.ranges) {
    if (visited.size >= MAX_STATS_CELLS) break;
    const dataFrom = Math.max(0, range.x - gutterColumns);
    const dataTo = Math.min(dataColumns, range.x + range.width - gutterColumns);
    if (dataTo <= dataFrom) continue;

    const fromRow = Math.max(0, range.y);
    const toRow = Math.min(viewLength, range.y + range.height);
    if (toRow <= fromRow) continue;

    for (let v = fromRow; v < toRow; v++) {
      if (visited.size >= MAX_STATS_CELLS) break;
      const rowBase = v * dataColumns;
      for (let c = dataFrom; c < dataTo; c++) {
        visited.add(rowBase + c);
        if (visited.size >= MAX_STATS_CELLS) break;
      }
    }
  }

  // 2. Whole selected rows (all data columns across each selected view row).
  for (const viewRow of selection.rows) {
    if (visited.size >= MAX_STATS_CELLS) break;
    if (viewRow < 0 || viewRow >= viewLength) continue;
    const rowBase = viewRow * dataColumns;
    for (let c = 0; c < dataColumns; c++) {
      visited.add(rowBase + c);
      if (visited.size >= MAX_STATS_CELLS) break;
    }
  }

  // 3. Whole selected columns (all visible view rows across each selected data column).
  for (const gridCol of selection.columns) {
    if (visited.size >= MAX_STATS_CELLS) break;
    const dataCol = gridCol - gutterColumns;
    if (dataCol < 0 || dataCol >= dataColumns) continue;
    for (let v = 0; v < viewLength; v++) {
      visited.add(v * dataColumns + dataCol);
      if (visited.size >= MAX_STATS_CELLS) break;
    }
  }

  const cellCount = visited.size;
  if (cellCount === 0) return null;
  if (cellCount < 2 && selection.rows.length === 0 && selection.columns.length === 0) {
    return null;
  }

  let emptyCount = 0;
  let numericCount = 0;
  let sum = 0;
  let min: number | null = null;
  let max: number | null = null;
  const distinct = new Set<string>();

  for (const coord of visited) {
    const viewRow = Math.floor(coord / dataColumns);
    const dataCol = coord % dataColumns;
    const sourceRow = view[viewRow];
    const raw = (sourceRow !== undefined ? table.rows[sourceRow]?.[dataCol] : undefined) ?? "";
    const trimmed = raw.trim();
    if (trimmed === "") {
      emptyCount += 1;
      continue;
    }
    distinct.add(trimmed);
    if (NUMERIC_CELL_RE.test(trimmed)) {
      const value = Number(trimmed);
      if (Number.isFinite(value)) {
        numericCount += 1;
        sum += value;
        if (min === null || value < min) min = value;
        if (max === null || value > max) max = value;
      }
    }
  }

  return {
    cellCount,
    distinctCount: distinct.size,
    emptyCount,
    numericCount,
    sum: numericCount > 0 ? sum : null,
    avg: numericCount > 0 ? sum / numericCount : null,
    min: numericCount > 0 ? min : null,
    max: numericCount > 0 ? max : null,
  };
}
