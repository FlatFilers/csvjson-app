import { parseCsvRecord, serializeCsvRow, type CsvTableData } from "./csvTable";

/**
 * Whole-table deletion transforms (spec increment: row/column deletion;
 * defect fix: deletion must be byte-preserving).
 *
 * Deletion splices the RAW source text — the same byte-fidelity contract the
 * cell-edit commit honors — instead of re-serializing the parsed grid. Row
 * deletion removes whole row spans plus their line terminators; column
 * deletion rewrites only the records that actually contain a dropped field.
 * The BOM, each row's own line ending, trailing-newline presence, and ragged
 * extra fields all survive untouched, and surviving rows keep their raw
 * widths — so malformed-CSV warnings for surviving ragged rows persist
 * (deleting the malformed row clears its warning naturally). The result
 * flows through the same guarded reconversion a cell edit takes, so the raw
 * CSV text stays the single source of truth. Both transforms are total:
 * indices outside the table are ignored.
 *
 * Deleting rows shifts source positions, so the caller must drop any
 * selection keyed by source index (the component already does).
 */

/** One raw-text replacement: the half-open span [start, end) becomes `replacement`. */
type Splice = { start: number; end: number; replacement: string };

/** Apply non-overlapping splices in ascending start order. Pure. */
function spliceAll(raw: string, splices: Splice[]): string {
  let out = "";
  let cursor = 0;
  for (const { start, end, replacement } of splices) {
    out += raw.slice(cursor, start) + replacement;
    cursor = end;
  }
  return out + raw.slice(cursor);
}

/** Length of the line terminator at `pos` (\r\n, \r, or \n), or 0 when there is none. */
function terminatorLengthAt(text: string, pos: number): number {
  if (text[pos] === "\r") return text[pos + 1] === "\n" ? 2 : 1;
  if (text[pos] === "\n") return 1;
  return 0;
}

/** Length of the line terminator ending at `pos` (i.e. occupying [pos - length, pos)). */
function terminatorLengthEndingAt(text: string, pos: number): number {
  if (text[pos - 2] === "\r" && text[pos - 1] === "\n") return 2;
  if (text[pos - 1] === "\r" || text[pos - 1] === "\n") return 1;
  return 0;
}

const UTF8_BOM = "\uFEFF";

/**
 * Span of the header record in `raw` — the parse's rowSpans exclude the
 * header, but column deletion rewrites it like any other record. The header
 * starts at the parse's BOM-aware span base and ends right before the single
 * terminator separating it from the first data row; with no data rows it is
 * the final record, ending before the file's trailing terminator if present.
 */
function headerSpanOf(raw: string, table: CsvTableData): { start: number; end: number } {
  const start = raw.startsWith(UTF8_BOM) ? UTF8_BOM.length : 0;
  const firstRow = table.rowSpans[0];
  if (firstRow !== undefined) {
    return { start, end: firstRow.start - terminatorLengthEndingAt(raw, firstRow.start) };
  }
  const text = raw.slice(start);
  return { start, end: start + text.length - terminatorLengthEndingAt(raw, raw.length) };
}

/**
 * Raw CSV text minus the given SOURCE row indices, spliced byte-preserving:
 * each removed region is the row's span plus its own trailing terminator.
 * Deleting the first data row removes ITS terminator (the preceding one
 * belongs to the header); a middle row's terminator goes with it so the next
 * row's leading bytes stay exact; deleting the last data row of a file that
 * ends with a trailing newline takes that terminator too (no stray blank
 * line), while a file without one removes just the span — the surviving
 * last row's own terminator becomes the ending. Delete-all-rows leaves a
 * headers-only file: exactly the header's own bytes plus its terminator.
 * Headers are kept even when every data row is dropped — a headers-only
 * table is valid.
 */
export function deleteRows(raw: string, table: CsvTableData, sources: readonly number[]): string {
  const splices = [...new Set(sources)]
    .flatMap((source) => {
      const span = table.rowSpans[source];
      return span === undefined ? [] : [span];
    })
    .sort((a, b) => a.start - b.start)
    .map((span) => ({
      start: span.start,
      end: span.end + terminatorLengthAt(raw, span.end),
      replacement: "",
    }));
  if (splices.length === 0) return raw;
  return spliceAll(raw, splices);
}

/**
 * Raw CSV text minus the given DATA column indices (0-based, excluding the
 * row-number gutter), spliced per record: parseCsvRecord over each raw row
 * span, drop the selected fields, serializeCsvRow the record back. Records
 * that lack every dropped field (short ragged rows) stay byte-identical —
 * no splice at all; only records actually containing the field get their
 * own bytes rewritten. Wide ragged rows keep their extra fields (extra
 * fields sit past the header-defined columns, which are the only ones
 * deletable). The header gets the same treatment as one record. Callers
 * must guarantee at least one column survives — the converter needs a
 * column to detect.
 */
export function deleteColumns(raw: string, table: CsvTableData, dataCols: readonly number[]): string {
  const dropped = new Set(
    [...dataCols].filter((col) => col >= 0 && col < table.headers.length)
  );
  if (dropped.size === 0) return raw;
  const spans = [headerSpanOf(raw, table), ...table.rowSpans];
  const splices: Splice[] = [];
  for (const span of spans) {
    const cells = parseCsvRecord(raw.slice(span.start, span.end), table.delimiter);
    if (![...dropped].some((col) => col < cells.length)) continue;
    const kept = cells.filter((_, col) => !dropped.has(col));
    splices.push({
      start: span.start,
      end: span.end,
      replacement: serializeCsvRow(kept, table.delimiter),
    });
  }
  return spliceAll(raw, splices);
}
