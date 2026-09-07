import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronUp, Copy, Search, X } from "lucide-react";
import { numericColumns, parseCsvTable, serializeCsvTable } from "@/lib/csvTable";
import {
  filterRowIndices,
  serializeCsvRow,
  sortRowIndices,
  splitHighlight,
  type SortDir,
} from "@/lib/tableView";
import { cn } from "@/lib/utils";

/**
 * Dense full-bleed CSV/TSV table (spec: CSV pane — sticky header, compact
 * rows, monospace numerics; criterion 5 — ~10k+ rows render virtualized
 * without frame freeze). Full-bleed inside its pane: no card chrome.
 *
 * v0 port: mono uppercase muted headers, a right-aligned row-number
 * column, hairline row rules with a hover wash, and em-dashes for empty
 * cells. Virtualization is untouched.
 *
 * Rows render through TanStack Virtual; row height is fixed so the estimate
 * is exact — no per-row measurement passes. Headers are position:sticky and
 * share the horizontal scroll with the rows; header and rows use the same
 * grid template so columns align.
 *
 * View powers (spec: CSV table superpowers, PR A): the toolbar's search
 * filter and the header sorts are pure index mappings over the parsed grid
 * (lib/tableView.ts) — the raw text is the single source of truth and is
 * never re-parsed while interacting. The view array maps virtual rows back
 * to source rows, so the gutter always shows the source row number and
 * selection (a set of source indices) survives filtering and sorting. Both
 * the input and output tables are this one component.
 *
 * Cell editing (spec: PR B) exists only when `onCellCommit` is passed — the
 * input table wires it to the raw-input handler, the output table stays
 * strictly read-only (no editor, no editing affordance). A commit
 * re-serializes the whole grid (lib/csvTable.ts serializeCsvTable) and hands
 * the text up; the grid never persists state — the commit is exactly a
 * raw-view keystroke of the serialized text.
 */

const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 26;
/** Minimum width per column; narrower viewports scroll horizontally. */
const COLUMN_MIN_WIDTH = 110;
/** Width of the leading row-number column. */
const ROW_NUMBER_WIDTH = 40;

type CsvTableProps = {
  text: string;
  /** Forced separator (, ; \t |) mirroring the converter's separator option; omitted → auto-detect. */
  delimiter?: string;
  testId?: string;
  /**
   * Cell-edit commit (input table only): called with the full grid
   * re-serialized to CSV text after an inline edit lands. Wiring it to the
   * raw-input handler routes the edit through the exact raw-view keystroke
   * path — debounce, guarded re-conversion, everything downstream. Omitted
   * → strictly read-only table: no editor opens, no editing affordance.
   */
  onCellCommit?: (nextText: string) => void;
};

type SortState = { col: number; dir: SortDir } | null;
/** The cell the inline editor is open on — source row index + column. */
type EditingCell = { row: number; col: number };

/** Toolbar button classes — dense chrome matching the header strip. */
const TOOLBAR_BUTTON =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] font-medium text-foreground hover:bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function CsvTable({ text, delimiter, testId = "csv-table", onCellCommit }: CsvTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set<number>());
  /** Source index of the last direct selection — the shift-click range anchor. */
  const anchorRef = useRef<number | null>(null);
  /** Cell the inline editor is open on (input table only — onCellCommit). */
  const [editing, setEditing] = useState<EditingCell | null>(null);
  /** Tab/Shift+Tab direction queued for the commit-on-blur (see the editor's keydown). */
  const advanceRef = useRef<-1 | 1 | null>(null);
  const editable = onCellCommit !== undefined;

  const table = useMemo(() => parseCsvTable(text, delimiter), [text, delimiter]);
  const numeric = useMemo(() => numericColumns(table), [table]);
  const columns = table.headers.length;

  // Debounce the search ~150ms so typing over a 10k-row grid re-filters once
  // per pause, not per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput), 150);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // Selection is a set of source row indices; a new parse can shrink the
  // grid. Drop indices that no longer exist so the toolbar count stays
  // honest (copy filters through the view anyway).
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<number>();
      let dropped = false;
      for (const index of prev) {
        if (index < table.rows.length) next.add(index);
        else dropped = true;
      }
      return dropped ? next : prev;
    });
  }, [table]);

  // Pure view: filter, then sort. Memoized on (table, query, sort) — typing
  // never re-parses the source text, and sorting composes on filtered indices.
  const view = useMemo(() => {
    const filtered = filterRowIndices(table.rows, query);
    if (!sort) return filtered;
    return sortRowIndices(filtered, table.rows, sort.col, sort.dir, numeric[sort.col] ?? false);
  }, [table, query, sort, numeric]);

  // The virtualizer counts view rows, not source rows — the window renderer
  // maps each view slot back to its source row via view[virtualRow.index].
  const virtualizer = useVirtualizer({
    count: view.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });
  const virtualRows = virtualizer.getVirtualItems();

  // Commit an open editor: splice the value into the parsed grid, serialize
  // the whole grid back to text (RFC 4180), and hand it to onCellCommit —
  // the same text pipeline a raw-view keystroke uses. An unchanged value
  // skips the write entirely (Enter on an untouched cell is a no-op) but
  // still moves to `next`, so Tab glides across cells without churn.
  const commitEdit = (value: string, next: EditingCell | null) => {
    if (!editing || !onCellCommit) return;
    const { row, col } = editing;
    if (value !== table.rows[row]?.[col]) {
      const grid = table.rows.map((cells, r) =>
        r === row ? [...cells.slice(0, col), value, ...cells.slice(col + 1)] : cells
      );
      onCellCommit(serializeCsvTable(table.headers, grid, table.delimiter));
    }
    setEditing(next);
  };

  // The adjacent cell in VIEW order — what the user sees. Tab walks columns
  // then wraps to the next visible row's first cell; Shift+Tab reverses.
  // Computed from the view snapshot at commit time; the effect below closes
  // the editor if a post-commit re-filter or re-sort hides the target.
  const adjacentCell = (cell: EditingCell, dir: -1 | 1): EditingCell | null => {
    const position = view.indexOf(cell.row);
    if (position === -1) return null;
    const nextCol = cell.col + dir;
    if (nextCol >= 0 && nextCol < columns) return { row: cell.row, col: nextCol };
    const nextPosition = position + dir;
    if (nextPosition < 0 || nextPosition >= view.length) return null;
    return dir === 1
      ? { row: view[nextPosition], col: 0 }
      : { row: view[nextPosition], col: columns - 1 };
  };

  // The editor only exists while its cell is in view: a commit can filter or
  // sort its row out (text is the source of truth), and a stale editing
  // state would resurrect the editor on a later view change. Also keeps a
  // Tab-advanced editor visible on tall grids.
  useEffect(() => {
    if (!editing) return;
    const position = view.indexOf(editing.row);
    if (position === -1) {
      setEditing(null);
      return;
    }
    const first = virtualRows[0]?.index;
    const last = virtualRows[virtualRows.length - 1]?.index;
    if (first === undefined || position < first || position > last) {
      virtualizer.scrollToIndex(position, { align: "auto" });
    }
    // Runs on editor open/advance, not on scroll-driven virtualRows churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, view]);

  if (columns === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        No columns detected.
      </div>
    );
  }

  const gridTemplate = `${ROW_NUMBER_WIDTH}px repeat(${columns}, minmax(${COLUMN_MIN_WIDTH}px, 1fr))`;
  const totalMinWidth = columns * COLUMN_MIN_WIDTH + ROW_NUMBER_WIDTH;
  const isFiltered = query !== "";
  const total = table.rows.length;

  const clearSearch = () => {
    setSearchInput("");
    setQuery("");
  };

  const cycleSort = (col: number) =>
    setSort((prev) => {
      if (!prev || prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return null;
    });

  const onGutterClick = (event: ReactMouseEvent<HTMLButtonElement>, sourceIndex: number) => {
    const anchor = anchorRef.current;
    if (event.shiftKey && anchor !== null && anchor !== sourceIndex) {
      // Range spans the current view order between the anchor and this row.
      const anchorPos = view.indexOf(anchor);
      const clickPos = view.indexOf(sourceIndex);
      const from = anchorPos === -1 ? clickPos : anchorPos;
      const [lo, hi] = from <= clickPos ? [from, clickPos] : [clickPos, from];
      const next = event.metaKey || event.ctrlKey ? new Set(selected) : new Set<number>();
      for (let p = lo; p <= hi; p++) next.add(view[p]);
      setSelected(next);
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      const next = new Set(selected);
      if (next.has(sourceIndex)) next.delete(sourceIndex);
      else next.add(sourceIndex);
      setSelected(next);
      anchorRef.current = sourceIndex;
      return;
    }
    setSelected(new Set([sourceIndex]));
    anchorRef.current = sourceIndex;
  };

  const clearSelection = () => {
    setSelected(new Set<number>());
    anchorRef.current = null;
  };

  // Selected rows currently visible in the view. The chip counts THESE —
  // never the raw selection set — so the number always matches what
  // Copy as CSV emits. Selection itself stays keyed by source index, so a
  // hidden selection comes back when the filter clears.
  const selectedInView = view.filter((index) => selected.has(index));

  const copySelection = () => {
    const lines = [
      serializeCsvRow(table.headers, table.delimiter),
      ...selectedInView.map((index) => serializeCsvRow(table.rows[index], table.delimiter)),
    ];
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {
      // Clipboard denial (permission, insecure context) degrades to a no-op —
      // same posture as the localStorage vote ids, never a broken page.
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Toolbar: dense strip matching the table chrome; sits above the
          sticky header so it never scrolls away with the body. */}
      <div
        data-testid={`${testId}-toolbar`}
        className="flex flex-none flex-wrap items-center gap-1.5 border-b border-border bg-panel px-2 py-1"
      >
        <div className="relative min-w-32 flex-1 sm:max-w-64">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground/60"
          />
          <input
            type="text"
            data-testid={`${testId}-search`}
            aria-label="Search rows"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") clearSearch();
            }}
            placeholder="Search…"
            className="h-6 w-full rounded-md border border-border bg-background pl-6 pr-6 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {searchInput !== "" && (
            <button
              type="button"
              data-testid={`${testId}-clear-search`}
              aria-label="Clear search"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-muted-foreground/60 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          )}
        </div>
        <span
          data-testid={`${testId}-count`}
          role="status"
          className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground"
        >
          {isFiltered
            ? `${view.length.toLocaleString()} of ${total.toLocaleString()}`
            : `${total.toLocaleString()} rows`}
        </span>
        {selectedInView.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span
              data-testid={`${testId}-selected-count`}
              className="text-[11px] font-medium tabular-nums text-muted-foreground"
            >
              {selectedInView.length.toLocaleString()} selected
            </span>
            <button type="button" data-testid={`${testId}-copy`} onClick={copySelection} className={TOOLBAR_BUTTON}>
              <Copy aria-hidden="true" className="size-3" />
              Copy as CSV
            </button>
            <button
              type="button"
              data-testid={`${testId}-clear-selection`}
              onClick={clearSelection}
              className={TOOLBAR_BUTTON}
            >
              Clear
            </button>
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        data-testid={testId}
        role="grid"
        aria-rowcount={view.length + 1}
        className="min-h-0 flex-1 overflow-auto"
      >
        {/* Total height = header + virtualized body; the spacer drives scrollbar size. */}
        <div
          className="relative"
          style={{
            height: virtualizer.getTotalSize() + HEADER_HEIGHT,
            minWidth: totalMinWidth,
          }}
        >
          <div
            className="sticky top-0 z-10 grid items-center border-b border-border bg-panel font-mono text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            style={{ height: HEADER_HEIGHT, gridTemplateColumns: gridTemplate }}
            role="row"
            aria-rowindex={1}
          >
            <div
              role="gridcell"
              aria-colindex={1}
              aria-hidden="true"
              className="truncate px-2 py-1 text-right font-normal text-muted-foreground/50 leading-[14px]"
            >
              #
            </div>
            {table.headers.map((header, index) => {
              const activeSort = sort?.col === index ? sort : null;
              return (
                <button
                  key={`${header}-${index}`}
                  type="button"
                  role="columnheader"
                  aria-colindex={index + 2}
                  aria-sort={activeSort ? (activeSort.dir === "asc" ? "ascending" : "descending") : undefined}
                  onClick={() => cycleSort(index)}
                  title={header}
                  className="cursor-pointer truncate px-2 py-1 text-left leading-[14px] outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="inline-flex items-center gap-0.5">
                    {header}
                    {activeSort && (
                      activeSort.dir === "asc" ? (
                        <ChevronUp aria-hidden="true" className="size-3" />
                      ) : (
                        <ChevronDown aria-hidden="true" className="size-3" />
                      )
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          {view.length === 0 && isFiltered ? (
            <div
              data-testid={`${testId}-empty-filter`}
              className="absolute inset-x-0 flex flex-col items-center gap-2 p-6 text-sm text-muted-foreground"
              style={{ top: HEADER_HEIGHT }}
            >
              <span>No rows matching “{query}”.</span>
              <button type="button" onClick={clearSearch} className={TOOLBAR_BUTTON}>
                Show all rows
              </button>
            </div>
          ) : (
            <div className="absolute inset-x-0" style={{ top: HEADER_HEIGHT, minWidth: totalMinWidth }}>
              {virtualRows.map((virtualRow) => {
                const sourceIndex = view[virtualRow.index];
                const row = table.rows[sourceIndex];
                const isSelected = selected.has(sourceIndex);
                return (
                  <div
                    key={virtualRow.key}
                    data-row-index={virtualRow.index}
                    data-source-index={sourceIndex}
                    role="row"
                    aria-rowindex={virtualRow.index + 2}
                    aria-selected={isSelected}
                    className={cn(
                      "absolute inset-x-0 grid items-center border-b border-border/60 text-[12px] leading-none transition-colors hover:bg-muted/50",
                      isSelected && "bg-muted"
                    )}
                    style={{
                      top: virtualRow.start,
                      height: ROW_HEIGHT,
                      gridTemplateColumns: gridTemplate,
                    }}
                  >
                    <div role="gridcell" aria-colindex={1} className="flex items-center justify-end">
                      <button
                        type="button"
                        data-testid={`${testId}-row-select`}
                        aria-label={`Select row ${sourceIndex + 1}`}
                        onClick={(event) => onGutterClick(event, sourceIndex)}
                        className="cursor-pointer select-none truncate px-2 text-right font-mono text-[11px] tabular-nums text-muted-foreground/40 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {sourceIndex + 1}
                      </button>
                    </div>
                    {row.map((cell, c) => {
                      const isEditing =
                        editing?.row === sourceIndex && editing.col === c;
                      const parts = cell === "" || !isFiltered ? null : splitHighlight(cell, query);
                      return (
                        <div
                          key={c}
                          role="gridcell"
                          aria-colindex={c + 2}
                          // Input table only: cells join the tab order and
                          // open the editor on click or Enter. The output
                          // table keeps zero editing affordances.
                          tabIndex={editable ? 0 : undefined}
                          onClick={
                            editable
                              ? () =>
                                  setEditing((prev) =>
                                    prev?.row === sourceIndex && prev.col === c
                                      ? prev
                                      : { row: sourceIndex, col: c }
                                  )
                              : undefined
                          }
                          onKeyDown={
                            editable
                              ? (event) => {
                                  if (event.key === "Enter" && !isEditing) {
                                    event.preventDefault();
                                    setEditing({ row: sourceIndex, col: c });
                                  }
                                }
                              : undefined
                          }
                          className={
                            "truncate" +
                            (editable ? " cursor-text" : "") +
                            (isEditing
                              ? // The editor input owns the box while open —
                                // no cell padding or em-dash ghost under it.
                                ""
                              : " px-2" +
                                (cell === ""
                                  ? // Empty cells keep their em-dash purely visual via
                                    // ::after — copying the table yields empty strings.
                                    " after:content-['—'] after:text-muted-foreground/30"
                                  : numeric[c]
                                    ? " font-mono tabular-nums"
                                    : ""))
                          }
                          title={cell}
                        >
                          {isEditing ? (
                            <input
                              key={`${sourceIndex}-${c}`}
                              data-testid={`${testId}-cell-editor`}
                              type="text"
                              defaultValue={cell}
                              aria-label={`Edit ${table.headers[c]}, row ${sourceIndex + 1}`}
                              // Select-all on open — the spreadsheet pattern:
                              // type replaces, arrows edit in place.
                              autoFocus
                              onFocus={(event) => event.currentTarget.select()}
                              onBlur={(event) => {
                                // Tab queues its direction before the blur;
                                // a plain blur (click away, Enter on the
                                // gutter) commits and closes.
                                const dir = advanceRef.current;
                                advanceRef.current = null;
                                commitEdit(
                                  event.currentTarget.value,
                                  dir === null || !editing
                                    ? null
                                    : adjacentCell(editing, dir)
                                );
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  commitEdit(event.currentTarget.value, null);
                                } else if (event.key === "Escape") {
                                  event.preventDefault();
                                  // Cancel discards silently — the input
                                  // unmounts and the cell renders its raw
                                  // text again.
                                  advanceRef.current = null;
                                  setEditing(null);
                                } else if (event.key === "Tab") {
                                  // Commit happens in onBlur (the blur this
                                  // triggers); only the advance direction is
                                  // queued here so blur and Tab share one
                                  // commit path.
                                  event.preventDefault();
                                  advanceRef.current = event.shiftKey ? -1 : 1;
                                  event.currentTarget.blur();
                                }
                              }}
                              className="h-full w-full min-w-0 bg-background px-2 font-mono text-[12px] outline-none ring-2 ring-inset ring-primary/50"
                            />
                          ) : parts ? (
                            parts.map((part, s) =>
                              part.hit ? (
                                <mark
                                  key={s}
                                  className="rounded-[2px] bg-amber-100 text-foreground dark:bg-amber-400/30 dark:text-amber-100"
                                >
                                  {part.text}
                                </mark>
                              ) : (
                                <span key={s}>{part.text}</span>
                              )
                            )
                          ) : (
                            cell
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
