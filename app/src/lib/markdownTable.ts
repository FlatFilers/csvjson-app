import { serializeCsvTable } from "./csvTable";

export interface DetectedTablePaste {
  cleanedCsv: string;
  rows: number;
  cols: number;
  kind: "markdown" | "box";
}

export interface ExtractedTableCandidate {
  index: number;
  title: string | null;
  label: string;
  headers: string[];
  cleanedCsv: string;
  rows: number;
  cols: number;
  kind: "markdown" | "box";
}

const UTF8_BOM = "\uFEFF";

/**
 * Fast pre-check over the first 64 KB: matches any line that is a Markdown
 * alignment separator (`| --- | --- |` or `---|---`), an ASCII box border
 * (`+---+---+`), or a `psql` rule (`----+----`). Large regular CSVs without
 * table rule lines are rejected in O(1) without splitting lines.
 */
const FAST_RULE_LINE_RE =
  /^\s*(?:\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?|\|\s*:?-{2,}:?\s*\||\+[-=]+(?:\+[-=]+)*\+|[-=]+(?:\+[-=]+)+)\s*$/m;

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

/**
 * Fenced code block delimiter (` ``` `, ` ```sql `, `~~~`).
 */
const CODE_FENCE_LINE_RE = /^\s*(?:`{3,}|~{3,})/;

/**
 * Markdown ATX heading (`# Heading`, `## Section Title ###`).
 */
const ATX_HEADING_LINE_RE = /^\s*#{1,6}\s+(.+?)\s*#*\s*$/;

/**
 * Standalone bold title line (`**Title**`, `**Title:**`, `__Title__`).
 */
const BOLD_TITLE_LINE_RE = /^\s*(?:\*\*([^*]+)\*\*|__([^_]+)__)\s*:?\s*$/;

/**
 * Setext heading underline (`=======` or `-------`).
 */
const SETEXT_UNDERLINE_RE = /^\s*(?:={3,}|-{3,})\s*$/;

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

function isBoxRuleOrBorder(line: string): boolean {
  return BOX_BORDER_LINE_RE.test(line) || PSQL_RULE_LINE_RE.test(line);
}

const MAX_TITLE_CHARS = 32;

function normalizeCandidateTitle(rawTitle: string): string | null {
  const cleaned = rawTitle
    .replace(/(\*\*|__|`)*/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*:\s*$/, "")
    .trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_TITLE_CHARS
    ? `${cleaned.slice(0, MAX_TITLE_CHARS - 1).trimEnd()}…`
    : cleaned;
}

function buildCandidateLabel(
  index: number,
  title: string | null,
  headers: string[]
): string {
  if (title) return title;
  const preview = headers
    .slice(0, 3)
    .map((h) => h.trim())
    .filter(Boolean)
    .join(", ");
  return preview ? `Table ${index + 1} (${preview})` : `Table ${index + 1}`;
}

function extractHeadingOrBoldTitle(
  line: string,
  nextLine?: string
): { title: string; consumedNextLine: boolean } | null {
  const atxMatch = ATX_HEADING_LINE_RE.exec(line);
  if (atxMatch) {
    const title = normalizeCandidateTitle(atxMatch[1]);
    if (title) return { title, consumedNextLine: false };
  }

  const boldMatch = BOLD_TITLE_LINE_RE.exec(line);
  if (boldMatch) {
    const title = normalizeCandidateTitle(boldMatch[1] ?? boldMatch[2] ?? "");
    if (title) return { title, consumedNextLine: false };
  }

  if (
    nextLine !== undefined &&
    SETEXT_UNDERLINE_RE.test(nextLine) &&
    line.trim().length > 0 &&
    !hasUnescapedPipe(line) &&
    !isBoxRuleOrBorder(line) &&
    !CODE_FENCE_LINE_RE.test(line)
  ) {
    const title = normalizeCandidateTitle(line);
    if (title) return { title, consumedNextLine: true };
  }

  return null;
}

/**
 * Scan a pasted Markdown document or CLI transcript and extract every
 * contiguous Markdown pipe table and `psql`/MySQL ASCII box table in document
 * order, capturing each table's nearest preceding `#` heading or `**bold**`
 * title line.
 *
 * Keeps O(1) fast rejection when the first 64 KB contains no Markdown
 * alignment separator (`|---|---|`) or CLI box rule (`+---+---+` / `----+----`).
 */
export function extractTablesFromMarkdownBlock(
  input: string
): ExtractedTableCandidate[] {
  if (!input) return [];
  const raw = input.startsWith(UTF8_BOM) ? input.slice(UTF8_BOM.length) : input;

  // Fast O(1) pre-check over the first 64 KB so multi-megabyte regular CSVs
  // never allocate a full-file line split.
  const headSlice = raw.slice(0, 64 * 1024);
  if (!headSlice.includes("|") || !FAST_RULE_LINE_RE.test(headSlice)) {
    return [];
  }

  const lines = raw.split(/\r?\n/);
  const candidates: ExtractedTableCandidate[] = [];
  let pendingTitle: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.length === 0 || CODE_FENCE_LINE_RE.test(line)) {
      i++;
      continue;
    }

    // Path 1: Bordered MySQL / ASCII box table starting with `+----+----+`
    if (BOX_BORDER_LINE_RE.test(line)) {
      let j = i + 1;
      let ruleCount = 1;
      const contentLines: string[] = [];

      while (j < lines.length) {
        const cur = lines[j];
        if (cur.trim().length === 0 || CODE_FENCE_LINE_RE.test(cur)) break;
        if (isBoxRuleOrBorder(cur)) {
          ruleCount++;
          j++;
          continue;
        }
        if (cur.includes("|") && !MD_SEPARATOR_ROW_RE.test(cur)) {
          contentLines.push(cur);
          j++;
          continue;
        }
        break;
      }

      if (j < lines.length && CLI_FOOTER_LINE_RE.test(lines[j])) {
        j++;
      }

      if (ruleCount >= 2 && contentLines.length >= 1) {
        const headers = parseBoxRow(contentLines[0], true);
        if (headers.length > 0 && !headers.every((h) => h === "")) {
          const dataRows = contentLines
            .slice(1)
            .map((rowLine) => parseBoxRow(rowLine, true));
          const cleanedCsv = serializeCsvTable(headers, dataRows, ",");
          const index = candidates.length;
          const title = pendingTitle;
          candidates.push({
            index,
            title,
            label: buildCandidateLabel(index, title, headers),
            headers,
            cleanedCsv,
            rows: dataRows.length,
            cols: headers.length,
            kind: "box",
          });
          pendingTitle = null;
          i = j;
          continue;
        }
      }

      i++;
      continue;
    }

    // Path 2: GitHub / ChatGPT Markdown pipe table (`header` + `|---|---|` + rows)
    if (
      hasUnescapedPipe(line) &&
      !isBoxRuleOrBorder(line) &&
      !MD_SEPARATOR_ROW_RE.test(line) &&
      !ATX_HEADING_LINE_RE.test(line) &&
      i + 1 < lines.length &&
      MD_SEPARATOR_ROW_RE.test(lines[i + 1])
    ) {
      const headers = parseMarkdownRow(line);
      if (headers.length > 0 && !headers.every((h) => h === "")) {
        const dataRows: string[][] = [];
        let j = i + 2;
        while (j < lines.length) {
          const cur = lines[j];
          if (
            cur.trim().length === 0 ||
            CODE_FENCE_LINE_RE.test(cur) ||
            isBoxRuleOrBorder(cur) ||
            ATX_HEADING_LINE_RE.test(cur)
          ) {
            break;
          }
          if (MD_SEPARATOR_ROW_RE.test(cur)) {
            j++;
            continue;
          }
          if (hasUnescapedPipe(cur)) {
            dataRows.push(parseMarkdownRow(cur));
            j++;
            continue;
          }
          break;
        }

        const cleanedCsv = serializeCsvTable(headers, dataRows, ",");
        const index = candidates.length;
        const title = pendingTitle;
        candidates.push({
          index,
          title,
          label: buildCandidateLabel(index, title, headers),
          headers,
          cleanedCsv,
          rows: dataRows.length,
          cols: headers.length,
          kind: "markdown",
        });
        pendingTitle = null;
        i = j;
        continue;
      }
    }

    // Path 3: `psql` ASCII box table (`header` + `----+----` rule + rows + optional `(N rows)`)
    if (
      hasUnescapedPipe(line) &&
      !isBoxRuleOrBorder(line) &&
      !MD_SEPARATOR_ROW_RE.test(line) &&
      !ATX_HEADING_LINE_RE.test(line) &&
      i + 1 < lines.length &&
      isBoxRuleOrBorder(lines[i + 1])
    ) {
      const contentLines: string[] = [line];
      let j = i + 2;
      while (j < lines.length) {
        const cur = lines[j];
        if (cur.trim().length === 0 || CODE_FENCE_LINE_RE.test(cur)) break;
        if (CLI_FOOTER_LINE_RE.test(cur)) {
          j++;
          break;
        }
        if (isBoxRuleOrBorder(cur)) {
          j++;
          continue;
        }
        if (cur.includes("|") && !MD_SEPARATOR_ROW_RE.test(cur)) {
          contentLines.push(cur);
          j++;
          continue;
        }
        break;
      }

      const firstContent = contentLines[0].trim();
      const framed =
        firstContent.startsWith("|") && firstContent.endsWith("|");
      const headers = parseBoxRow(contentLines[0], framed);
      if (headers.length > 0 && !headers.every((h) => h === "")) {
        const dataRows = contentLines
          .slice(1)
          .map((rowLine) => parseBoxRow(rowLine, framed));
        const cleanedCsv = serializeCsvTable(headers, dataRows, ",");
        const index = candidates.length;
        const title = pendingTitle;
        candidates.push({
          index,
          title,
          label: buildCandidateLabel(index, title, headers),
          headers,
          cleanedCsv,
          rows: dataRows.length,
          cols: headers.length,
          kind: "box",
        });
        pendingTitle = null;
        i = j;
        continue;
      }
    }

    // Non-table line: check if it is a `#` heading or `**bold**` title line
    const headingMatch = extractHeadingOrBoldTitle(line, lines[i + 1]);
    if (headingMatch) {
      pendingTitle = headingMatch.title;
      i += headingMatch.consumedNextLine ? 2 : 1;
      continue;
    }

    i++;
  }

  return candidates;
}

/**
 * Detect and normalize GitHub/ChatGPT Markdown pipe tables and `psql`/MySQL
 * ASCII box tables into canonical comma-delimited RFC 4180 CSV.
 *
 * Supports both standalone tables and Markdown documents containing prose or
 * multiple tables (`tableIndex` selects which detected table to return,
 * clamped to `[0, candidates.length - 1]`).
 *
 * Returns `null` for plain CSV, TSV, JSON, or pipe-delimited CSV that lacks a
 * Markdown alignment separator row (`|---|---|`) or CLI box border/rule line
 * (`+---+---+` / `----+----`).
 */
export function detectMarkdownOrCliTable(
  input: string,
  tableIndex = 0
): DetectedTablePaste | null {
  const candidates = extractTablesFromMarkdownBlock(input);
  if (candidates.length === 0) return null;
  const clampedIndex = Math.min(
    Math.max(0, Math.trunc(tableIndex) || 0),
    candidates.length - 1
  );
  const chosen = candidates[clampedIndex];
  return {
    cleanedCsv: chosen.cleanedCsv,
    rows: chosen.rows,
    cols: chosen.cols,
    kind: chosen.kind,
  };
}
