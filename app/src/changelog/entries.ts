/**
 * Bundled changelog entries (spec: CSVJSON changelog widget, art_YzASNds2).
 *
 * Entries ship inside the hashed JS bundle — no fetch, no cache rule, no new
 * CI gate. Ids are monotonic integers that order the list and drive the
 * unseen-dot logic (any entry id > lastSeenId). Rendering goes through
 * newestFirst(), so the newest id is always on top regardless of the order
 * entries happen to be authored in this array.
 *
 * Authoring convention (recorded in .obvious/obvious.md): a PR that changes
 * what users experience adds one entry — or amends its own unreleased one —
 * in the same PR. Internal-only changes (CI, deps, admin) get no entry.
 */

export interface ChangelogEntry {
  /** Monotonic, never reused; ordering + unseen logic. */
  id: number;
  /** ISO "2026-09-05", displayed relatively ("2 days ago"). */
  date: string;
  /** User-visible, plain language. */
  title: string;
  /** 1–2 sentences. */
  summary: string;
  tag?: "new" | "fix" | "improvement";
}

/**
 * Rendered order: a sorted copy with the newest id first. Defensive — the
 * bundled array is authored newest first, but an out-of-order append must
 * never silently reshuffle the popout.
 */
export function newestFirst(entries: ChangelogEntry[]): ChangelogEntry[] {
  return [...entries].sort((a, b) => b.id - a.id);
}

export const changelogEntries: ChangelogEntry[] = [
  {
    id: 22,
    date: "2026-10-20",
    tag: "new",
    title: "Column visibility picker and Apply view to output",
    summary:
      "Use the new Columns menu in any data table to hide or restore columns without touching your raw input. When a search filter, sort order, or column subset is active, toggle Apply view to output to project that exact table view into the converted output, Copy, and Download.",
  },
  {
    id: 21,
    date: "2026-10-20",
    tag: "new",
    title: "Paste Markdown & CLI box tables directly into CSV → JSON",
    summary:
      "Paste GitHub/ChatGPT Markdown pipe tables or psql/MySQL ASCII box tables directly into CSV → JSON: divider rows, outer pipes, and (N rows) footers are stripped automatically, with a one-click Clean table action to normalize the raw CSV in place.",
  },
  {
    id: 20,
    date: "2026-10-20",
    tag: "new",
    title: "One-click nested JSON flattening in JSON → CSV",
    summary:
      "When JSON → CSV input contains nested objects or arrays, a contextual Flatten nested keys pill appears above the editor to expand deep objects into dotted CSV column headers (like user.profile.name) and join scalar arrays in one click.",
  },
  {
    id: 19,
    date: "2026-10-20",
    tag: "new",
    title: "Pin per-column types in the CSV grid",
    summary:
      "Select any column in the CSV table to pin its JSON output type to String, Number, Boolean, or Auto — keeping postal codes and IDs as strings or coercing yes/no/1/0 columns to booleans without changing global parse settings.",
  },
  {
    id: 18,
    date: "2026-10-20",
    tag: "new",
    title: "Live spreadsheet selection aggregates in the table toolbar",
    summary:
      "Select any range of cells, rows, or columns in the data table to see instant cell, distinct, and empty counts alongside numeric Sum, Avg, Min, and Max aggregates. Range selections also expose one-click Copy as CSV right from the toolbar.",
  },
  {
    id: 17,
    date: "2026-10-20",
    tag: "new",
    title: "Export CSV as JSONL, SQL INSERTs, or TypeScript",
    summary:
      "Switch the CSV → JSON output header between JSON, JSONL, SQL, and TS to generate newline-delimited records, CREATE TABLE and INSERT statements with inferred types, or a typed TypeScript DataRow interface and array ready to copy or download.",
  },
  {
    id: 16,
    date: "2026-10-20",
    tag: "new",
    title: "Restore recent conversions from the top bar",
    summary:
      "The new Recent menu in the top bar saves up to 10 valid conversions locally on your device so you can jump back to an earlier dataset in one click. Fresh page loads still start on a clean empty dropzone.",
  },
  {
    id: 15,
    date: "2026-10-18",
    tag: "improvement",
    title: "Options fold into a Parse settings menu",
    summary:
      "On narrower screens the converter's options bar no longer wraps onto extra lines — it collapses to a single Parse settings line showing your active options, with the full control set in a drop-up above it. Small screens lose the accordion that squeezed the panes.",
  },
  {
    id: 14,
    date: "2026-10-17",
    tag: "improvement",
    title: "Polished mobile stacked panes and collapsible options bar",
    summary:
      "Small screens now stack the input and output panes with an in-flow direction switch and compact icon actions so nothing overlaps. The options bar collapses into a one-tap summary on phones while keeping every setting a tap away.",
  },
  {
    id: 13,
    date: "2026-10-15",
    tag: "fix",
    title: "Faster large CSV uploads without page freezes",
    summary:
      "Uploading large CSV files now converts in a single pass without freezing the tab or flashing a false error state, previews multi-megabyte JSON outputs smoothly while keeping full Copy and Download, and decodes UTF-16 CSV exports automatically.",
  },
  {
    id: 12,
    date: "2026-10-15",
    tag: "improvement",
    title: "Table undo, header rename, and smarter JSON input",
    summary:
      "Undo or redo CSV table edits, double-click any column header to rename it in place, and collapse .0, .1 indexed columns into JSON arrays. JSON → CSV now formats or minifies JSON in one click, unwraps nested record arrays, parses JSONL, and previews pipe-delimited output accurately.",
  },
  {
    id: 11,
    date: "2026-10-03",
    tag: "improvement",
    title: "The switch names the direction",
    summary:
      "The ⇄ switch now labels the active conversion, and legacy /json2csv links land you in JSON → CSV mode again — it never left.",
  },
  {
    id: 10,
    date: "2026-09-08",
    tag: "new",
    title: "Delete rows and columns from the table",
    summary:
      "Select rows or columns in the input table and delete them by button or the Delete key — the raw CSV updates and reconverts in place, with at least one column always kept. Selected column headers are also readable again in both themes.",
  },
  {
    id: 9,
    date: "2026-09-08",
    tag: "new",
    title: "Spreadsheet-grade data table",
    summary:
      "The rebuilt data table adds drag-to-select ranges, Shift+Arrow range extension, fill, and spreadsheet-style cell editing — with copy/paste always producing clean CSV.",
  },
  {
    id: 8,
    date: "2026-09-07",
    tag: "new",
    title: "Search, sort, and select in the data table",
    summary:
      "The CSV table now has a search bar with a live row count, click-to-sort columns, and row selection with copy-as-CSV — on both the input and output tables.",
  },
  {
    id: 7,
    date: "2026-09-07",
    tag: "fix",
    title: "No more layout flash on load",
    summary:
      "The converter now renders side-by-side immediately on desktop, instead of stacking the panes and snapping into columns as the page loads.",
  },
  {
    id: 6,
    date: "2026-09-07",
    tag: "new",
    title: "Introducing the changelog",
    summary:
      "This changelog keeps you posted on what's new — recent updates appear here with an unseen dot when you come back. Feel free to vote on what you find useful.",
  },
  {
    id: 5,
    date: "2026-09-05",
    tag: "improvement",
    title: "Icons match the design",
    summary:
      "Action buttons, view toggle, and the empty state now use the same crisp icon set as the rest of the interface.",
  },
  {
    id: 4,
    date: "2026-09-05",
    tag: "new",
    title: "Edit the JSON output in place",
    summary:
      "The output pane is now an editor. Hand edits survive until you reconvert; revert and discard keep you safe.",
  },
  {
    id: 3,
    date: "2026-09-05",
    tag: "fix",
    title: "Pastes land where they belong",
    summary:
      "Paste anywhere on the page and your data routes to the input — including pastes over the read-only output pane.",
  },
  {
    id: 2,
    date: "2026-09-04",
    tag: "improvement",
    title: "A calmer empty state",
    summary:
      "Empty panes now open on a compact paste field with a Choose file button, so starting is obvious on any screen.",
  },
  {
    id: 1,
    date: "2026-09-04",
    tag: "improvement",
    title: "Smarter number handling",
    summary:
      "Numbers convert sensibly out of the box: leading-zero values like 00721 and very long IDs stay strings so nothing gets silently mangled.",
  },
];
