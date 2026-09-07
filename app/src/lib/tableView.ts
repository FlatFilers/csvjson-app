/**
 * Pure view transforms for the CSV table (spec: CSV table superpowers,
 * PR A — view powers). Index mappings over the already-parsed grid: the raw
 * CSV text stays the single source of truth and the table never re-parses on
 * interaction — filtering and sorting only rearrange row indices.
 *
 * Everything here is pure and synchronous so the virtualizer can render the
 * mapped window exactly as before; CsvTable maps
 * sourceIndex = view[virtualRow.index] and keeps the fixed 24px row height.
 */

export type SortDir = "asc" | "desc";

/** Integer-shaped cells with 16+ digits can exceed Number's exact range. */
const BIG_INT_RE = /^[+-]?\d{16,}$/;

/**
 * Rows matching `query` as a case-insensitive substring across any cell.
 * An empty query is the identity — every row, in source order. Matching rows
 * keep source order so the gutter's source row numbers stay monotonic while
 * filtering.
 */
export function filterRowIndices(rows: string[][], query: string): number[] {
  const all = Array.from({ length: rows.length }, (_, i) => i);
  if (query === "") return all;
  const needle = query.toLowerCase();
  return all.filter((i) => {
    const row = rows[i];
    for (let c = 0; c < row.length; c++) {
      if (row[c].toLowerCase().includes(needle)) return true;
    }
    return false;
  });
}

/**
 * Sort a (possibly already filtered) list of row indices by one column.
 * Numeric columns compare numerically with non-numeric cells (empty or
 * unparseable) forced last in either direction; text columns use
 * localeCompare. The input array is not mutated; ties keep source order
 * (Array#sort is stable).
 */
export function sortRowIndices(
  indices: number[],
  rows: string[][],
  col: number,
  dir: SortDir,
  numeric: boolean
): number[] {
  const factor = dir === "asc" ? 1 : -1;
  return [...indices].sort((a, b) => {
    // Rows are padded to the header width by parseCsvTable; the ?? keeps the
    // comparator total even for a hand-built shorter row in tests.
    const cellA = rows[a]?.[col] ?? "";
    const cellB = rows[b]?.[col] ?? "";
    if (numeric) {
      // An empty cell is "no value", not zero — treat it as non-numeric so
      // it lands with the NaN tail instead of sorting as 0.
      const na = cellA === "" ? NaN : Number(cellA);
      const nb = cellB === "" ? NaN : Number(cellB);
      const aNan = Number.isNaN(na);
      const bNan = Number.isNaN(nb);
      if (aNan || bNan) {
        // Non-numerics forced last regardless of direction; among
        // themselves they keep source order (0 → stable).
        if (aNan && bNan) return 0;
        return aNan ? 1 : -1;
      }
      // Integers beyond 2^53 lose precision as doubles — 64-bit id columns
      // (Snowflake/Dynamo/Slack exports) collapse to the same value and
      // mis-sort silently. Compare big integer-shaped cells exactly.
      if (BIG_INT_RE.test(cellA) && BIG_INT_RE.test(cellB)) {
        const ba = BigInt(cellA);
        const bb = BigInt(cellB);
        return factor * (ba < bb ? -1 : ba > bb ? 1 : 0);
      }
      return factor * (na - nb);
    }
    return factor * cellA.localeCompare(cellB);
  });
}

/**
 * Split `text` into a copyable sequence of literal and match parts for
 * in-cell highlight rendering. Case-insensitive, literal (no regex — the
 * query is user text). An empty query yields a single literal part.
 */
export function splitHighlight(text: string, query: string): { text: string; hit: boolean }[] {
  if (query === "") return text === "" ? [] : [{ text, hit: false }];
  const needle = query.toLowerCase();
  const haystack = text.toLowerCase();
  if (needle === "" || !haystack.includes(needle)) {
    return text === "" ? [] : [{ text, hit: false }];
  }
  const parts: { text: string; hit: boolean }[] = [];
  let cursor = 0;
  for (;;) {
    const at = haystack.indexOf(needle, cursor);
    if (at === -1) break;
    if (at > cursor) parts.push({ text: text.slice(cursor, at), hit: false });
    parts.push({ text: text.slice(at, at + needle.length), hit: true });
    cursor = at + needle.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), hit: false });
  return parts;
}

/**
 * Serialize one CSV record: fields containing the delimiter, a quote, CR or
 * LF are RFC 4180 quoted with doubled inner quotes; everything else passes
 * through verbatim so copied cells stay byte-identical to the source.
 */
export function serializeCsvRow(cells: string[], delimiter: string): string {
  return cells
    .map((cell) => {
      if (cell.includes('"')) return `"${cell.replaceAll('"', '""')}"`;
      if (cell.includes(delimiter) || cell.includes("\n") || cell.includes("\r")) {
        return `"${cell}"`;
      }
      return cell;
    })
    .join(delimiter);
}
