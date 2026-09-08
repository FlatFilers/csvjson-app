/**
 * CSV/TSV table parser for the dense table renderer. Pure: source string in,
 * headers + cell rows out — never throws. This is display-only: conversion
 * itself always goes through the csvjson packages (src/lib/convert.ts); this
 * parser exists because the table needs raw cells, including ragged rows the
 * package would pad or drop.
 *
 * RFC 4180 handling: quoted fields with embedded delimiters, escaped quotes,
 * and embedded newlines. Ragged rows are padded to the header width.
 */

export type CsvTableData = {
  headers: string[];
  /** Data rows, padded to headers.length. Empty cells stay "" — never null. */
  rows: string[][];
  delimiter: string;
  /** Raw field count per data row, before padding or truncation. */
  rowWidths: number[];
  /**
   * Character span of each data row in the text parseCsvTable was called
   * with (aligned with `rows`): start inclusive, end exclusive, line
   * terminator excluded. Lets a cell-edit commit splice just the edited
   * row back into the source so untouched rows keep their exact bytes —
   * ragged fields, CRLF endings, trailing newline.
   */
  rowSpans: Array<{ start: number; end: number }>;
};

const UTF8_BOM = "\uFEFF";

/**
 * Best-effort delimiter detection over , ; \t — same trio the conversion
 * packages auto-detect. Counts candidates outside quoted fields across the
 * first 20 records and picks the most frequent; comma wins ties.
 */
export function detectDelimiter(text: string): string {
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  let best = ",";
  let bestCount = -1;
  let recordsSeen = 0;
  let inQuotes = false;

  for (let i = 0; i < text.length && recordsSeen < 20; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') i++;
      else inQuotes = !inQuotes;
    } else if (!inQuotes && char in counts) {
      counts[char]++;
    } else if (char === "\n") {
      recordsSeen++;
    }
  }

  for (const delimiter of [",", ";", "\t"]) {
    if (counts[delimiter] > bestCount) {
      best = delimiter;
      bestCount = counts[delimiter];
    }
  }
  return best;
}

/**
 * Parse one field starting at `start`. Returns the field text and the offset
 * of its terminator (delimiter, line end, or EOF — not consumed).
 */
function parseField(source: string, start: number, delimiter: string): [string, number] {
  if (source[start] === '"') {
    // Quoted field: "" inside is an escaped quote; delimiters/newlines are literal.
    let out = "";
    let i = start + 1;
    for (;;) {
      if (i >= source.length) return [out, i];
      const char = source[i];
      if (char === '"') {
        if (source[i + 1] === '"') {
          out += '"';
          i += 2;
        } else {
          // Closing quote — tolerate trailing content (Excel-style) up to
          // the next delimiter or line end.
          i++;
          while (i < source.length && source[i] !== delimiter && source[i] !== "\n" && source[i] !== "\r") i++;
          return [out, i];
        }
      } else {
        out += char;
        i++;
      }
    }
  }
  let end = start;
  while (end < source.length && source[end] !== delimiter && source[end] !== "\n" && source[end] !== "\r") end++;
  return [source.slice(start, end), end];
}

/**
 * Parse CSV/TSV text into headers + padded cell rows. Never throws.
 * CRLF/LF/CR line endings all accepted; a trailing newline does not create
 * an empty trailing row.
 */
export function parseCsvTable(raw: string, forcedDelimiter?: string): CsvTableData {
  const bomStripped = raw.startsWith(UTF8_BOM);
  const text = bomStripped ? raw.slice(UTF8_BOM.length) : raw;
  // Row spans report offsets into the caller's string (BOM included), so a
  // commit can slice/splice the very text it holds.
  const spanBase = bomStripped ? UTF8_BOM.length : 0;
  const delimiter = forcedDelimiter ?? detectDelimiter(text);

  const records: string[][] = [];
  const recordSpans: Array<{ start: number; end: number }> = [];
  let current: string[] = [];
  let recordStart = 0;
  let i = 0;
  // A consumed delimiter promises one more field — even at end of text
  // (RFC 4180: "a,b," is three fields, the last empty).
  let expectField = false;

  while (i < text.length || expectField) {
    if (current.length === 0) recordStart = i;
    expectField = false;
    const [field, end] = parseField(text, i, delimiter);
    current.push(field);
    if (end >= text.length) break;
    if (text[end] === delimiter) {
      i = end + 1;
      expectField = true;
      continue;
    }
    // Line terminator — \r\n, \r, or \n. The span ends before it, so a
    // splice around the span keeps the file's own line endings.
    i = text[end] === "\r" && text[end + 1] === "\n" ? end + 2 : end + 1;
    records.push(current);
    recordSpans.push({ start: recordStart + spanBase, end: end + spanBase });
    current = [];
  }
  if (current.length > 0) {
    records.push(current);
    recordSpans.push({ start: recordStart + spanBase, end: text.length + spanBase });
  } else if (records.length === 0 && current.length === 0 && text.length > 0) {
    // Single empty field ("") — the degenerate one-line input.
    records.push([""]);
    recordSpans.push({ start: 0 + spanBase, end: text.length + spanBase });
  }

  const headers = records.length > 0 ? records[0] : [];
  const width = headers.length;
  // Raw widths survive the pad/truncate below — the malformed-CSV warning
  // detector (convert.ts) compares them against the header width.
  const rawRows = records.slice(1);
  const rowWidths = rawRows.map((row) => row.length);
  const rows = rawRows.map((row) => {
    if (row.length === width) return row;
    if (row.length > width) return row.slice(0, width);
    return [...row, ...Array<string>(width - row.length).fill("")];
  });

  return { headers, rows, delimiter, rowWidths, rowSpans: recordSpans.slice(1) };
}

/**
 * Serialize one CSV record back to text — the cell-edit commit's write
 * primitive (spec: CSV table superpowers, PR B). RFC 4180: any cell
 * containing a quote, the delimiter, CR or LF is wrapped in quotes with
 * inner quotes doubled; everything else passes through. Total: any string
 * array in, a string out; it cannot fail by construction.
 *
 * The optional delimiter (default ",") serializes back with the table's own
 * detected or forced separator, so editing a cell in a TSV never rewrites
 * the row as comma-CSV. When the delimiter is not comma, cells containing
 * that delimiter are quoted too — the row must re-parse identically.
 */
export function serializeCsvRow(cells: string[], delimiter = ","): string {
  const escape = (cell: string): string => {
    if (cell.includes('"')) return `"${cell.replaceAll('"', '""')}"`;
    if (cell.includes(delimiter) || cell.includes("\n") || cell.includes("\r")) {
      return `"${cell}"`;
    }
    return cell;
  };
  return cells.map(escape).join(delimiter);
}

/**
 * Serialize a parsed grid back to CSV text — the whole-grid view of
 * serializeCsvRow. No trailing newline is added, so
 * parse(serialize(parse(text))) yields the same grid and re-serializes to
 * the same text — the round-trip is stable. Total: any string arrays in, a
 * string out; it cannot fail by construction.
 */
export function serializeCsvTable(headers: string[], rows: string[][], delimiter = ","): string {
  return [headers, ...rows]
    .map((record) => serializeCsvRow(record, delimiter))
    .join("\n");
}

/**
 * Parse one raw CSV record — a single row's exact span from the source
 * text — into its true cells: no header-width padding or truncation. The
 * cell-edit commit uses this so an edit to a padded/truncated display row
 * still rewrites the row's real field list, preserving ragged extra fields.
 * Pass the table's own delimiter — a lone row slice can't be re-detected
 * reliably (a quoted semicolon would win detection, for instance).
 */
export function parseCsvRecord(raw: string, forcedDelimiter?: string): string[] {
  return parseCsvTable(raw, forcedDelimiter).headers;
}

/**
 * Columns whose non-empty cells all parse as numbers (and at least one is)
 * render monospace with tabular figures — the spec's "monospace numerics".
 */
export function numericColumns(table: CsvTableData): boolean[] {
  const NUMERIC = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
  const flags = Array.from({ length: table.headers.length }, () => true);
  const sawCell = Array.from({ length: table.headers.length }, () => false);
  for (const row of table.rows) {
    for (let c = 0; c < row.length; c++) {
      const cell = row[c];
      if (cell === "") continue;
      flags[c] = flags[c] && NUMERIC.test(cell);
      sawCell[c] = true;
    }
  }
  // The contract is per-column: an all-empty column is not numeric, no
  // matter what the other columns contain.
  return flags.map((flag, c) => flag && sawCell[c]);
}
