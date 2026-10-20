import { serializeCsvTable } from "./csvTable";

export interface DetectedTablePaste {
  cleanedCsv: string;
  rows: number;
  cols: number;
  kind: "markdown" | "box";
}

const UTF8_BOM = "\uFEFF";

/**
 * GitHub / ChatGPT Markdown pipe table alignment separator row:
 * e.g. `| --- | :---: | ---: |` or `---|---` or `| --- |`.
 */
const MD_SEPARATOR_ROW_RE =
  /^\s*(?:\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?|\|\s*:?-{2,}:?\s*\|)\s*$/;

/**
 * ASCII box horizontal border line (`+----+----+` or `+====+====+`).
 */
const BOX_BORDER_LINE_RE = /^\s*\+[-=]+(?:\+[-=]+)*\+\s*$/;

/**
 * `psql` horizontal separator rule line (`----+----+----` or `====+====`).
 */
const PSQL_RULE_LINE_RE = /^\s*[-=]+(?:\+[-=]+)+\s*$/;

/**
 * Optional trailing CLI row-count footer (`(2 rows)`, `(1 row)`, `2 rows in set (0.00 sec)`).
 */
const CLI_FOOTER_LINE_RE =
  /^\s*(?:\(\d+\s+rows?\)|\d+\s+rows?\s+in\s+set(?:\s*\([^)]*\))?)\s*$/i;

function hasUnescapedPipe(line: string): boolean {
  for (let i = 0; i < line.length; i++) {
    if (line[i] === "\\" && i + 1 < line.length) {
      i++;
      continue;
    }
    if (line[i] === "|") return true;
  }
  return false;
}

function endsWithUnescapedPipe(trimmed: string): boolean {
  if (!trimmed.endsWith("|")) return false;
  let backslashes = 0;
  for (let i = trimmed.length - 2; i >= 0 && trimmed[i] === "\\"; i--) {
    backslashes++;
  }
  return backslashes % 2 === 0;
}

/**
 * Split a Markdown table row on unescaped `|`, stripping optional outer
 * leading/trailing `|`, unescaping `\|` -> `|`, and trimming cell padding.
 */
function parseMarkdownRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith("|")) {
    body = body.slice(1);
  }
  if (endsWithUnescapedPipe(body)) {
    body = body.slice(0, -1);
  }

  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "\\" && body[i + 1] === "|") {
      current += "|";
      i++;
      continue;
    }
    if (ch === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * Split a CLI / ASCII box row on `|`, stripping outer border pipes when the
 * table is framed (`| a | b |`) and trimming cell whitespace.
 */
function parseBoxRow(line: string, framed: boolean): string[] {
  let body = line.trim();
  if (framed) {
    if (body.startsWith("|")) body = body.slice(1);
    if (body.endsWith("|")) body = body.slice(0, -1);
  }
  return body.split("|").map((cell) => cell.trim());
}

/**
 * Extract the first `limit` non-empty lines from `text` without splitting the
 * entire string — keeps large-CSV non-matches O(1).
 */
function peekFirstNonEmptyLines(text: string, limit: number): string[] {
  const result: string[] = [];
  const maxScan = Math.min(text.length, 32 * 1024);
  let lineStart = 0;

  for (let i = 0; i <= maxScan; i++) {
    const atEnd = i === maxScan;
    const ch = atEnd ? "\n" : text[i];
    if (ch === "\n" || ch === "\r") {
      const line = text.slice(lineStart, i);
      if (line.trim().length > 0) {
        result.push(line);
        if (result.length >= limit) return result;
      }
      if (ch === "\r" && text[i + 1] === "\n") {
        i++;
      }
      lineStart = i + 1;
    }
  }
  return result;
}

function isBoxRuleOrBorder(line: string): boolean {
  return BOX_BORDER_LINE_RE.test(line) || PSQL_RULE_LINE_RE.test(line);
}

/**
 * Detect and normalize GitHub/ChatGPT Markdown pipe tables and `psql`/MySQL
 * ASCII box tables into canonical comma-delimited RFC 4180 CSV.
 *
 * Returns `null` for plain CSV, TSV, JSON, or pipe-delimited CSV that lacks a
 * Markdown alignment separator row (`|---|---|`) or CLI box border/rule line
 * (`+---+---+` / `----+----`).
 */
export function detectMarkdownOrCliTable(
  input: string
): DetectedTablePaste | null {
  if (!input) return null;
  const raw = input.startsWith(UTF8_BOM) ? input.slice(UTF8_BOM.length) : input;

  // Fast O(1) pre-check over the first 3 non-empty lines so large regular CSVs
  // never allocate a full-file line split.
  const head = peekFirstNonEmptyLines(raw, 3);
  if (head.length < 2) return null;

  const isMarkdownCandidate =
    hasUnescapedPipe(head[0]) &&
    !isBoxRuleOrBorder(head[0]) &&
    !MD_SEPARATOR_ROW_RE.test(head[0]) &&
    MD_SEPARATOR_ROW_RE.test(head[1]);

  const isPsqlCandidate =
    hasUnescapedPipe(head[0]) &&
    !isBoxRuleOrBorder(head[0]) &&
    (PSQL_RULE_LINE_RE.test(head[1]) || BOX_BORDER_LINE_RE.test(head[1]));

  const isBorderedBoxCandidate =
    BOX_BORDER_LINE_RE.test(head[0]) &&
    hasUnescapedPipe(head[1]) &&
    !isBoxRuleOrBorder(head[1]) &&
    (head.length < 3 || isBoxRuleOrBorder(head[2]) || hasUnescapedPipe(head[2]));

  if (!isMarkdownCandidate && !isPsqlCandidate && !isBorderedBoxCandidate) {
    return null;
  }

  const nonEmptyLines = raw
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (nonEmptyLines.length < 2) return null;

  // Path A: GitHub / ChatGPT Markdown pipe table
  if (isMarkdownCandidate && MD_SEPARATOR_ROW_RE.test(nonEmptyLines[1])) {
    const headers = parseMarkdownRow(nonEmptyLines[0]);
    if (headers.length === 0 || headers.every((h) => h === "")) return null;

    const dataRows: string[][] = [];
    for (let i = 2; i < nonEmptyLines.length; i++) {
      const line = nonEmptyLines[i];
      if (MD_SEPARATOR_ROW_RE.test(line)) continue;
      if (!hasUnescapedPipe(line)) return null;
      dataRows.push(parseMarkdownRow(line));
    }

    const cleanedCsv = serializeCsvTable(headers, dataRows, ",");
    return {
      cleanedCsv,
      rows: dataRows.length,
      cols: headers.length,
      kind: "markdown",
    };
  }

  // Path B: psql / MySQL ASCII box table
  let lineCount = nonEmptyLines.length;
  if (lineCount >= 2 && CLI_FOOTER_LINE_RE.test(nonEmptyLines[lineCount - 1])) {
    lineCount--;
  }

  let sawRuleOrBorder = false;
  const contentLines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const line = nonEmptyLines[i];
    if (isBoxRuleOrBorder(line)) {
      sawRuleOrBorder = true;
      continue;
    }
    if (! line.includes("|")) return null;
    contentLines.push(line);
  }

  if (!sawRuleOrBorder || contentLines.length === 0) return null;

  const firstContent = contentLines[0].trim();
  const framed =
    BOX_BORDER_LINE_RE.test(nonEmptyLines[0]) ||
    (firstContent.startsWith("|") && firstContent.endsWith("|"));

  const headers = parseBoxRow(contentLines[0], framed);
  if (headers.length === 0 || headers.every((h) => h === "")) return null;

  const dataRows = contentLines
    .slice(1)
    .map((line) => parseBoxRow(line, framed));

  const cleanedCsv = serializeCsvTable(headers, dataRows, ",");
  return {
    cleanedCsv,
    rows: dataRows.length,
    cols: headers.length,
    kind: "box",
  };
}
