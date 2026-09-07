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
  const text = raw.startsWith(UTF8_BOM) ? raw.slice(UTF8_BOM.length) : raw;
  const delimiter = forcedDelimiter ?? detectDelimiter(text);

  const records: string[][] = [];
  let current: string[] = [];
  let i = 0;

  while (i < text.length) {
    const [field, end] = parseField(text, i, delimiter);
    current.push(field);
    if (end >= text.length) break;
    if (text[end] === delimiter) {
      i = end + 1;
      continue;
    }
    // Line terminator — \r\n, \r, or \n.
    i = text[end] === "\r" && text[end + 1] === "\n" ? end + 2 : end + 1;
    records.push(current);
    current = [];
  }
  if (current.length > 0) records.push(current);
  else if (records.length === 0 && current.length === 0 && text.length > 0) {
    // Single empty field ("") — the degenerate one-line input.
    records.push([""]);
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

  return { headers, rows, delimiter, rowWidths };
}

/**
 * Serialize a parsed grid back to CSV text — the cell-edit commit's write
 * path (spec: CSV table superpowers, PR B). RFC 4180: any cell containing a
 * quote, the delimiter, CR or LF is wrapped in quotes with inner quotes
 * doubled; everything else passes through. No trailing newline is added, so
 * parse(serialize(parse(text))) yields the same grid and re-serializes to
 * the same text — the round-trip is stable. Total: any string arrays in, a
 * string out; it cannot fail by construction.
 *
 * The optional delimiter (default ",") serializes back with the table's own
 * detected or forced separator, so editing a cell in a TSV never rewrites
 * the file as comma-CSV. When the delimiter is not comma, cells containing
 * that delimiter are quoted too — the grid must re-parse identically.
 */
export function serializeCsvTable(headers: string[], rows: string[][], delimiter = ","): string {
  const escape = (cell: string): string => {
    if (cell.includes('"')) return `"${cell.replaceAll('"', '""')}"`;
    if (cell.includes(delimiter) || cell.includes("\n") || cell.includes("\r")) {
      return `"${cell}"`;
    }
    return cell;
  };
  return [headers, ...rows]
    .map((record) => record.map(escape).join(delimiter))
    .join("\n");
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
